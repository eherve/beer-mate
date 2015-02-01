'use strict';

var express = require('express');
var router = express.Router();
var util = require('util');
var redis = require('../redis');
var uuid = require('node-uuid');
var logger = require('../logger').get('Route');
var NotFoundError = require('../errors/notFoundError');
var UnauthorizedError = require('../errors/unauthorizedError');
var BadRequestError = require('../errors/badRequestError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../models/user');
var Resource = require('../resource');
var Email = require('../email');
var Auth = require('../tools/auth');

var TOKEN_NAME = 'auth_token';
var CONFIRM_EXPIRATION_DELAY = 24 * 60 * 60 * 1000;

// Login

router.post('/login', function(req, res, next) { // TODO what if already connected ?
  if (!req.body.email || !req.body.password) {
    return next(new BadRequestError());
  }
  var email = req.body.email; var password = req.body.password;
  logger.debug(util.format('Login user %s', email));
  UserModel.authenticate(email, password, function (err, user) {
    if (err && !user) { return next(err); }
    if (!user) { return next(new UnauthorizedError()); }
    var token = uuid.v4();
    redis.register(token, user._id, user.administrator, function(err) {
      if (err) { return next(err); }
      res.set(TOKEN_NAME, token).send(token);
    });
  });
});

// Logout

router.get('/logout', Auth.userConnected, function(req, res, next) {
  if (!req.get(TOKEN_NAME) && !req.query[TOKEN_NAME]) {
    return next(new BadRequestError());
  }
  var token = req.get(TOKEN_NAME) || req.query[TOKEN_NAME];
  logger.debug(util.format('Logout user token: %s', token));
  redis.unregister(token, function(err) {
    if (err) { return next(err); }
      res.set(TOKEN_NAME, undefined).end();
  });
});

// Join

function sendConfirmationEmail(req, user, token, expires) {
  Resource.getEmailFile('confirmationEmail', req.locale, function(err, file) {
    if (err) { return; }
    Email.send(user.email, req.translate('email.confirmation'), file,
    { host: req.get('host'), user: user, token: token, expires: expires,
      creation: true }, function(err) {
        if (err) { return; }
        logger.debug('Validation email sent');
      }
    );
  });
}

router.post('/join', function(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  if (!email || !password) { return next(new BadRequestError()); }
  var token = uuid.v4();
  var expires = new Date(Date.now() + CONFIRM_EXPIRATION_DELAY);
  (new UserModel({ email: email, password: password,
    validation: { token: token, expires: expires }
  })).save(function(err, user) {
    if (err) { return next(err); }
    sendConfirmationEmail(req, user, token, expires);
    res.end();
  });
});

// Confirm

router.get('/confirm/:userId/:token', function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    if (user.validated === true) { return res.end(); } // TODO validate ok page ?
    if (user.validation.token !== req.params.token ||
      user.validation.expires < Date.now()) {
        return next(new NotFoundError());
    }
    user.validated = true;
    user.save(function(err) {
      if (err) { return next(err); }
      res.end(); // TODO validate ok page ?
    });
  });
});

module.exports = router;
