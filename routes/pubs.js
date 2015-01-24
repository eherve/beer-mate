'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../errors/notFoundError');
var UnauthorizedError = require('../errors/unauthorizedError');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../models/pub');

router.get('/', function(req, res, next) {
  PubModel.find({}, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.post('/', function(req, res, next) {
  if (!req.user) { return next(new UnauthorizedError()); }
  var pub = new PubModel(req.body);
  pub.userId = req.user._id;
  pub.save(function(err) {
    console.log(err);
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:pubId', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (pub) { return res.send(pub); }
    next(new NotFoundError());
  });
});

module.exports = router;
