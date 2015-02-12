'use strict';

var express = require('express');
var router = express.Router();
var util = require('util');
var uuid = require('node-uuid');
var logger = require('../../logger').get('Route');
var NotFoundError = require('../../errors/notFoundError');
var UnauthorizedError = require('../../errors/unauthorizedError');
var ForbiddenError = require('../../errors/forbiddenError');
var BadRequestError = require('../../errors/badRequestError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');
var Resource = require('../../resource');
var Email = require('../../email');
var Auth = require('../../tools/auth');

var CONFIRM_EXPIRATION_DELAY = 24 * 60 * 60 * 1000;

// Login

router.post('/login', function(req, res, next) {
  Auth.adminConnected(req, res, function(err) {
    if (!err) { return Auth.sendToken(res, req.redisData.token); }
    if (!req.body.email || !req.body.password) {
      return next(new BadRequestError());
    }
    var email = req.body.email; var password = req.body.password;
    logger.debug(util.format('Login user %s', email));
    UserModel.authenticate(email, password, function (err, user) {
      if (err && !user) { return next(err); }
      if (!user) { return next(new UnauthorizedError()); }
      if (!user.administrator) { return next(new ForbiddenError()); }
      req.user = user;
      next();
    });
  });
}, Auth.login);

// Logout

router.get('/logout', Auth.userConnected, function(req, res, next) {
  logger.debug(util.format('Logout user token: %s', req.redisData.token));
  next();
}, Auth.logout);

module.exports = router;
