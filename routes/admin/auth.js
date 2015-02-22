'use strict';

var express = require('express');
var router = express.Router();
var util = require('util');
var logger = require('../../logger').get('Route');
var UnauthorizedError = require('../../errors/unauthorizedError');
var ForbiddenError = require('../../errors/forbiddenError');
var BadRequestError = require('../../errors/badRequestError');
var UserModel = require('../../models/user');
var Auth = require('../../tools/auth');

// Login

router.post('/login', function(req, res, next) {
  Auth.adminConnected(req, res, function(err) {
    if (!err) { return Auth.sendToken(req, res, req.redisData.token); }
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
