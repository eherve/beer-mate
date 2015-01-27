'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');
var logger = require('../logger').get('Route');
var BadRequestError = require('../errors/badRequestError');
var UserModel = require('../models/user');
var Resource = require('../resource');
var Email = require('../email');

router.post('/login', passport.authenticate('local'), function(req, res) {
  res.end();
});

router.get('/logout', function(req, res) {
  req.logout();
  res.end();
});

function sendConfirmationEmail(email) {
  Resource.getEmailFile('confirmationEmail', function(err, file) {
    if (err) { return; }
    Email.send(email, 'email.confirmation', file, function(err) {
      if (err) { return; }
      logger.debug('Validation email sent');
    });
  });
}

router.post('/join', function(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  if (!email || !password) { return next(new BadRequestError()); }
  (new UserModel({ email: email, password: password })).save(function(err) {
    if (err) { return next(err); }
    sendConfirmationEmail(email);
    res.end();
  });
});

module.exports = router;
