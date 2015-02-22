'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var ForbiddenError = require('../../errors/forbiddenError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');
var uuid = require('node-uuid');
var Resource = require('../../resource');
var Email = require('../../email');
var emailLogger = require('../../logger').get('Email');

var ALLOWED_CREATE_FIELD = 'firstname lastname email password';
var ALLOWED_UPDATE_FIELD = 'firstname lastname';

router.get('/', Auth.adminConnected, function(req, res, next) {
  UserModel.find(function(err, users) {
    if (err) { return next(err); }
    res.send(users);
  });
});

router.post('/', Auth.adminConnected, function(req, res, next) {
  var user = new UserModel();
  user.merge(req.body, { fields: ALLOWED_CREATE_FIELD });
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

router.put('/:userId', Auth.userConnected, function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  if (req.redisData.id !== id) { return next(new ForbiddenError()); }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    user.merge(req.body, { fields: ALLOWED_UPDATE_FIELD });
    user.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

/* Favorites */

// TODO add filter on one pub to check
router.get('/:userId/favorites', Auth.userConnected, function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  if (req.redisData.id !== id) { return next(new ForbiddenError()); }
  UserModel.findOne({ _id: new ObjectId(id) }, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    res.send(user.favorites);
  });
});

router.post('/:userId/favorites', Auth.userConnected, function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  if (req.redisData.id !== id) { return next(new ForbiddenError()); }
  UserModel.update({ _id: id },
    { $addToSet: { favorites: { _id: new ObjectId(req.body.pubId) } } },
    function(err) {
      if (err) { return next(err); }
      res.end();
    }
  );
});

router.delete('/:userId/favorites', Auth.userConnected,
  function(req, res, next) {
    var id = req.params.userId;
    if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
    if (req.redisData.id !== id) { return next(new ForbiddenError()); }
    UserModel.update({ _id: id },
      { $pull: { favorites: new ObjectId(req.body.pubId) } },
      function(err) {
        if (err) { return next(err); }
        res.end();
      }
    );
  }
);

/* Change password */

router.post('/:userId/change-password', function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  if (req.redisData.id !== id) { return next(new ForbiddenError()); }
  var oldpass = req.body.oldPass;
  var newpass = req.body.newPass;
  if (!oldpass || !newpass || newpass.trim() === '' || oldpass === newpass) {
    // INFO should be a 400 ?
    return next(new ForbiddenError());
  }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    UserModel.modifyPassword(id, oldpass, newpass, function(err, user) {
      if (err) { return next(err); }
      // INFO if it happends why ? maybe notfound error ?
      if (!user) { return next(new ForbiddenError()); }
      res.end();
    });
  });
});

/* Reset password */

function sendResetPassEmail(req, user, token) {
  Resource.getEmailFile('resetPasswordEmail', req.locale, function(err, file) {
    if (err) { return; }
    Email.send(user.email, req.translate('email.reset-password'), file,
    { host: req.get('host'), user: user, token: token }, function(err) {
      if (err) {
        return emailLogger.error('Send reset password email failed', err);
      }
      emailLogger.debug('Reset password email sent');
    });
  });
}

router.post('/reset-password', function(req, res, next) {
  var email = req.body.email;
  // INFO should be a 400 ?
  if (!email || email.trim() === '') { return next(new ForbiddenError()); }
  var newpass = req.body.newPass;
  var field = '+password +salt +passwordreset.password';
  UserModel.findOne({ email: email }, field, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    if (user.passwordreset && user.passwordreset.password &&
      user.passwordreset.password.trim() !== '') {
        // INFO should be a 400 ?
        return next(new ForbiddenError());
      }
    user.passwordreset = { password: newpass, token: uuid.v4() };
    user.save(function(err) {
      if (err) { return next(err); }
      sendResetPassEmail(req, user, user.passwordreset.token);
      res.end();
    });
  });
});

router.get('/:userId/password-reset', function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var uuid = req.query.uuid;
  var field = '+passwordreset.password '+
      '+passwordreset.date +passwordreset.token';
  UserModel.findById(id, field, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    if (!user.passwordreset || !user.passwordreset.password ||
      user.passwordreset.password.trim() === '') {
        return next(new ForbiddenError());
      }
    if (user.passwordreset.token !== uuid) {
      // INFO should be a 400 ?
      return next(new ForbiddenError());
    }
    user.password = user.passwordreset.password;
    user.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

module.exports = router;
