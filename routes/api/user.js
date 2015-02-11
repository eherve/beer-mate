'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');


router.get('/', Auth.adminConnected, function(req, res, next) {
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

router.post('/', Auth.adminConnected, function(req, res, next) {
  var user = new UserModel(req.body);
  user.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:userId', Auth.adminConnected, function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (user) { return res.send(user); }
    next(new NotFoundError());
  });
});

module.exports = router;
