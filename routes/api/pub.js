'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');

var ALLOWED_MERGE_FIELD = 'name phone address webSite days currency';

function getSkip(req) {
  if (req.query.skip && !isNaN(parseInt(req.query.skip))) {
    return parseInt(req.query.skip);
  }
  return null;
}

function getLimit(req) {
  if (req.query.limit && !isNaN(parseInt(req.query.limit))) {
    return parseInt(req.query.limit);
  }
  return null;
}

function addLocalizationFilter(filters, query) {
  if (query.longitude === undefined ||
  query.latitude === undefined) { return; }
  filters['address.loc'] = {
    $nearSphere: {
      $geometry: {
        type : 'Point', coordinates : [
          parseFloat(query.longitude), parseFloat(query.latitude)
        ]
      }
    }
  };
  if (query.maxDistance !== undefined) {
    filters['address.loc'].$nearSphere.$maxDistance =
      parseFloat(query.maxDistance);
  }
  if (query.minDistance !== undefined) {
    filters['address.loc'].$nearSphere.$minDistance =
      parseFloat(query.minDistance);
  }
}

function getFilters(query) {
  var filters = {};
  addLocalizationFilter(filters, query);
  if (query.city !== undefined) { filters['address.city'] = query.city; }
  return filters;
}

function getFields(query) {
  if ('string' !== typeof query.fields) { return undefined; }
  var fields = '';
  query.fields.split(',').forEach(function(field) {
    field = field.trim().replace(/^[+-]+/g, '');
    if (field.length > 0) {
      fields = util.format('%s %s', fields, field);
    }
  });
  return fields;
}

router.get('/', function(req, res, next) {
  var filters = getFilters(req.query);
  var fields = 'name address days currency';
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.post('/', Auth.userConnected, function(req, res, next) {
  req.body.ratings = []; req.body.comments = []; req.body.checkIn = [];
  var pub = new PubModel(req.body);
  pub.userId = req.redisData.id;
  pub.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:pubId', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var fields = getFields(req.query);
  PubModel.findById(id, fields, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    res.send(pub);
  });
});

router.put('/:pubId', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    pub.merge(req.body, { fields: ALLOWED_MERGE_FIELD });
    pub.updatedAt = Date.now();
    pub.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

/* Comments */

router.get('/:pubId/comments', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, '_id', function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    var aggregate = PubModel.aggregate();
    aggregate.match({ _id: new ObjectId(id) })
    .unwind('comments').sort({ 'comments.createdAt': -1 });
    var skip = getSkip(req); if (skip !== null) { aggregate.skip(skip); }
    var limit = getLimit(req); if (limit !== null) { aggregate.limit(limit); }
    aggregate.group({ _id: '$_id',
      nbComments: { $first: '$nbComments' },
      comments: { $push: '$comments' }
    });
    aggregate.project({ nbComments: 1, comments: 1 });
    aggregate.exec(function(err, data) {
      if (err) { return next(err); }
      PubModel.populate(data,
        [ { path: 'comments.userId', select: 'firstname lastname' } ],
        function(err, data) {
          if (err) { return next(err); }
          data = data[0] || { _id: id, nbComments: 0, comments: [] };
          data.skip = skip; data.limit = limit;
          res.send(data);
        }
      );
    });
  });
});

router.post('/:pubId/comments', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'comments', function(err, pub) {
    if (err) { return next(err); }
    req.body.userId = req.redisData.id; pub.comments.push(req.body);
    pub.nbComments = pub.comments.length;
    pub.save(function(err, pub) {
      if (err) { return next(err); }
      var comment = pub.comments[pub.comments.length - 1].toObject();
      comment.comments = { userId: comment.userId }; delete comment.userId;
      PubModel.populate([ comment ],
        [ { path: 'comments.userId', select: 'firstname lastname' } ],
        function(err, comments) {
          if (err) { return next(err); }
          comment = comments[0];
          comment.userId = comment.comments.userId; delete comment.comments;
          res.send(comment);
        }
      );
    });
  });
});

/* Ratings */

router.get('/:pubId/ratings', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'ratings', function(err, pub) {
    if (err) { return next(err); }
    res.send(pub.ratings);
  });
});

router.post('/:pubId/ratings', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'ratings', function(err, pub) {
    if (err) { return next(err); }
    var userId = req.redisData.id; var avg = 0; var found = false;
    for (var index = 0; index < pub.ratings.length; ++index) {
      var rating = pub.ratings[index];
      if (rating && rating.userId && rating.userId.equals(userId)) {
        found = true; rating.note = req.body.note; rating.createdAt = null;
      }
      avg = avg + rating.note;
    }
    if (!found) {
      req.body.userId = userId; req.body.createdAt = null;
      pub.ratings.push(req.body);
      avg = avg + parseInt(req.body.note);
    }
    pub.rating = avg / pub.ratings.length;
    pub.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

/* CheckIn */

router.get('/:pubId/check-in', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'checkIn', function(err, pub) {
    if (err) { return next(err); }
    res.send(pub.checkIn);
  });
});

router.post('/:pubId/check-in', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'checkIn', function(err, pub) {
    if (err) { return next(err); }
    req.body.userId = req.redisData.id;
    pub.checkIn.push(req.body);
    pub.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

module.exports = router;
