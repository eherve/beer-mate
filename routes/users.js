'use strict';

var express = require('express');
var apiRouter = express.Router();
var viewRouter = express.Router();
var NotFoundError = require('../errors/notFoundError');
var UnauthorizedError = require('../errors/unauthorizedError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../models/user');

function isAdministrator(req) {
  return req.user && req.user.administrator === true;
}

/* API */

apiRouter.get('/', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

apiRouter.post('/', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var user = new UserModel(req.body);
  user.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

apiRouter.get('/:userId', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (user) { return res.send(user); }
    next(new NotFoundError());
  });
});

/* View */

viewRouter.get('/', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  res.render('users');
});

viewRouter.get('/datatable', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  UserModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

module.exports = { api: apiRouter, view: viewRouter };
