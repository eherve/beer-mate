'use strict';

var express = require('express');
var router = express.Router();
var PubModel = require('mongoose').model('Pub');

/*
router.all('/*', function(req, res, next) {
  if (req.user) { return next(); }
  var err = new Error('Unauthorized');
  err.status = 401;
  next(err);
});
*/

router.get('/', function(req, res, next) {
  PubModel.find(function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.post('/', function(req, res, next) {
  var pub = new PubModel(req.body);
  pub.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:pubId', function(req, res, next) {
  PubModel.findById(req.params.pubId, function(err, pub) {
    if (err) { return next(err); }
    if (pub) { return res.send(pub); }
    err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
});

module.exports = router;
