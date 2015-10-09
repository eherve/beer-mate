'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var ObjectId = require('mongoose').Types.ObjectId;
var CheckinModel = require('../../models/checkin');
var PubModel = require('../../models/pub');
var UserModel = require('../../models/user');
var Auth = require('../../tools/auth');

var USER_TYPE = 'user';
var PUB_TYPE = 'pub';

router.path = '/checkin';

function getType(req) {
  return req.query.userId ? USER_TYPE : PUB_TYPE;
}

// Get checkin
router.get('/', function(req, res, next) {
  var type = getType(req);
  var id = type === USER_TYPE ? req.query.userId : req.query.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var filter = {}; filter[type] = id;
  CheckinModel.find(filter, function(err, checkin) {
    if (err) { return next(err); }
    res.send(checkin);
  });
});

// Count checkin
router.get('/count', function(req, res, next) {
   var type = getType(req);
  var id = type === USER_TYPE ? req.query.userId : req.query.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var filter = {}; filter[type] = id;
  CheckinModel.count(filter, function(err, count) {
    if (err) { return next(err); }
    res.send({ total: count });
  });
});

// Count distinct
router.get('/count-distinct', function(req, res, next) {
   var type = getType(req);
  var id = type === USER_TYPE ? req.query.userId : req.query.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var match = {}; match[type] = new ObjectId(id);
  var group = {}; group._id = util.format('$%s',
    type === USER_TYPE ? PUB_TYPE : USER_TYPE);
  var count = { _id: null, total: { $sum: 1 } };
  var aggregate = CheckinModel.aggregate();
  aggregate.match(match).group(group).group(count);
  aggregate.exec(function(err, data) {
    if (err) { return next(err); }
    res.send({ total: data && data.length > 0 ? data[0].total : 0 });
  });
});

/* ADD checkin */

function addPubCheckin(checkin, cb) {
  PubModel.update({ _id: checkin.pub },
    { $addToSet: { checkin: checkin._id } },
    function(err) {
      if (!err) { return cb(); }
      var errs = [ err ];
      UserModel.update({ _id: checkin.user },
        { $pull: { checkin: checkin._id } },
        function(err) {
          if (err) { errs.push(err); }
          CheckinModel.remove({ _id: checkin._id }, function(err) {
            if (err) { errs.push(err); }
            cb(errs);
          });
        }
      );
    }
  );
}

function addUserCheckin(checkin, cb) {
  UserModel.update({ _id: checkin.user },
    { $addToSet: { checkin: checkin._id } },
    function(err) {
      if (!err) { return cb(); }
      var errs = [ err ];
      CheckinModel.remove({ _id: checkin._id }, function(err) {
        if (err) { errs.push(err); }
        cb(errs);
      });
    }
  );
}

router.post('/', Auth.userConnected, function(req, res, next) {
  var pubId = req.body.pubId;
  if (!ObjectId.isValid(pubId)) { return next(new NotFoundError()); }
  req.body.date = Date.now();
  var checkin = new CheckinModel(req.body);
  checkin.user = req.redisData.id;
  checkin.pub = pubId;
  checkin.save(function(err, checkin) {
    if (err) { return next(err); }
    addUserCheckin(checkin, function(err) {
      if (err) { return next(err); }
      addPubCheckin(checkin, function(err) {
        if (err) { return next(err); }
        res.end();
      });
    });
  });
});

module.exports = router;
