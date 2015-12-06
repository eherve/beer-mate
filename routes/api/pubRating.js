'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');

router.path = '/pubs/:pubId';
router.middlewares = [
	function(req, res, next) {
		var id = req.params.pubId;
		if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
		req.pubId = id;
		next();
	}
];

router.get('/rating', function(req, res, next) {
  PubModel.findById(req.pubId, 'rating', function(err, pub) {
    if (err) { return next(err); }
    res.send({ rating: pub.rating });
  });
});

router.get('/my-rating', Auth.userConnected, function(req, res, next) {
  var field = { ratings: { $elemMatch: { userId: req.redisData.id } } };
  PubModel.findById(req.pubId, field, function(err, pub) {
    if (err) { return next(err); }
    res.send(pub.ratings.length > 0 ? pub.ratings[0] : {});
  });
});

router.get('/ratings', function(req, res, next) {
  PubModel.findById(req.pubId, 'ratings rating', function(err, pub) {
    if (err) { return next(err); }
    res.send(pub);
  });
});

router.post('/ratings', Auth.userConnected, function(req, res, next) {
  PubModel.findById(req.pubId, 'ratings', function(err, pub) {
    if (err) { return next(err); }
    var userId = req.redisData.id; var avg = 0; var found = false;
    for (var index = 0; index < pub.ratings.length; ++index) {
      var rating = pub.ratings[index];
      if (rating && rating.userId && rating.userId.equals(userId)) {
        found = true; rating.note = req.body.note; delete rating.createdAt;
      }
      avg = avg + rating.note;
    }
    if (!found) {
      req.body.userId = userId; delete req.body.createdAt;
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

module.exports = router;
