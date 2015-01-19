'use strict';

var express = require('express');
var router = express.Router();
var UserModel = require('mongoose').model('User');

router.all('/*', function(req, res, next) {
  if (req.user) { return next(); }
  var err = new Error('Unauthorized');
  err.status = 401;
  next(err);
});

router.get('/', function(req, res, next) {
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

router.post('/', function(req, res, next) {
  var user = new UserModel(req.body);
  user.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:userId', function(req, res, next) {
  UserModel.findById(req.params.userId, function(err, user) {
    if (err) { return next(err); }
    if (user) { return res.send(user); }
    err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
});

module.exports = router;
