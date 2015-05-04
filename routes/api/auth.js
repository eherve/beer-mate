'use strict';

var express = require('express');
var router = express.Router();
var util = require('util');
var uuid = require('node-uuid');
var https = require('https');
var logger = require('../../logger').get('Route');
var NotFoundError = require('../../errors/notFoundError');
var UnauthorizedError = require('../../errors/unauthorizedError');
var BadRequestError = require('../../errors/badRequestError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');
var Resource = require('../../resource');
var Email = require('../../email');
var Auth = require('../../tools/auth');

var CONFIRM_EXPIRATION_DELAY = 24 * 60 * 60 * 1000;
var FB_FIRSTNAME_KEY = 'first_name';
var FB_LASTNAME_KEY = 'last_name';

function buildUserFromFbData(data) {
  return new UserModel({ email: data.email, facebookId: data.id,
    firstname: data[FB_FIRSTNAME_KEY], lastname: data[FB_LASTNAME_KEY],
    validated: true, password: UserModel.generateRandomPassword() });
}

function validateFbTokenReq(tk, cb) {
  var options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: util.format('/me?access_token=%s', tk),
    method: 'GET'
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(data) {
      data = JSON.parse(data);
      if (res.statusCode === 200) { cb(null, data); }
      else {
        data.error.status = res.statusCode;
        cb(data.error);
      }
    });
  });
  req.end();
  req.on('error', cb);
}


// Login

router.post('/login', function(req, res, next) {
  Auth.userConnected(req, res, function(err) {
    if (!err) { return Auth.sendToken(req, res, req.redisData.token); }
    if (!req.body.email || !req.body.password) {
      return next(new BadRequestError());
    }
    var email = req.body.email; var password = req.body.password;
    logger.debug(util.format('Login user %s', email));
    UserModel.authenticate(email, password, function (err, user) {
      if (err && !user) { return next(err); }
      if (!user) { return next(new UnauthorizedError()); }
      req.user = user;
      next();
    });
  });
}, Auth.login);

router.post('/facebook-login', function(req, res, next) {
  Auth.userConnected(req, res, function(err) {
    if (!err) { return Auth.sendToken(req, res, req.redisData.token); }
    if (!req.body.facebookToken) { return next(new BadRequestError()); }
    logger.debug(util.format('Facebook user token %s', req.body.facebookToken));
    validateFbTokenReq(req.body.facebookToken, function(err, data) {
      if (err) { return next(err); }
      logger.debug(util.format('facebook user id %s', data.id));
      UserModel.findOne({ facebookId: data.id }, '_id locale administrator',
      function(err, user) {
        if (err) { return next(err); }
        if (user) { req.user = user; return next(); }
        buildUserFromFbData(data).save(function(err, user) {
          if (err) { return next(err); }
          req.user = user; next();
        });
      });
    });
  });
}, Auth.login);

// Logout

router.get('/logout', Auth.userConnected, function(req, res, next) {
  logger.debug(util.format('Logout user token: %s', req.redisData.token));
  next();
}, Auth.logout);

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
    // TODO validate ok page ?
    if (user.validated === true) { return res.end(); }
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
