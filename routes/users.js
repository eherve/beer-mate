'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../errors/notFoundError');
var UnauthorizedError = require('../errors/unauthorizedError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../models/user');

function isAdministrator(req) {
  return req.user && req.user.administrator === true;
}

router.get('/', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

router.post('/', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var user = new UserModel(req.body);
  user.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:userId', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (user) { return res.send(user); }
    next(new NotFoundError());
  });
});

module.exports = router;
