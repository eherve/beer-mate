'use strict';

var express = require('express');
var apiRouter = express.Router();
var viewRouter = express.Router();
var NotFoundError = require('../errors/notFoundError');
var Auth = require('../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../models/user');

/* API */

apiRouter.get('/', Auth.adminConnected, function(req, res, next) {
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

apiRouter.post('/', Auth.adminConnected, function(req, res, next) {
  var user = new UserModel(req.body);
  user.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

apiRouter.get('/:userId', Auth.adminConnected, function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (user) { return res.send(user); }
    next(new NotFoundError());
  });
});

/* View */

viewRouter.get('/', Auth.adminConnected, function(req, res) {
  res.render('users');
});

viewRouter.get('/datatable', Auth.adminConnected, function(req, res, next) {
  UserModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

module.exports = { api: apiRouter, view: viewRouter };
