'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');

var ALLOWED_MERGE_FIELD = 'name phone address webSite days currency';

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
  var fields = getFields(req.query);
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
  PubModel.findById(id, 'comments', function(err, pub) {
    if (err) { return next(err); }
    res.send(pub.comments);
  });
});

router.post('/:pubId/comments', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, 'comments', function(err, pub) {
    if (err) { return next(err); }
    req.body.userId = req.redisData.id;
    pub.comments.push(req.body);
    pub.nbComments = pub.nbComments + 1;
    pub.save(function(err) {
      if (err) { return next(err); }
      res.end();
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
    var userId = req.redisData.id;
    // Unicity on the user for the rating and avg
    var avg = 0;
    for (var index = 0; index < pub.ratings.length; ++index) {
      var rating = pub.ratings[index];
      if (rating && rating.userId && rating.userId.equals(userId)) {
        return next(new Error('User has already rated the pub !'));
      }
      avg = avg + rating.note;
    }
    req.body.userId = userId;
    pub.ratings.push(req.body);
    pub.rating = (avg + parseInt(req.body.note)) / pub.ratings.length;
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
