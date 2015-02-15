'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var ForbiddenError = require('../../errors/forbiddenError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');
var uuid = require('node-uuid');

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

router.post('/:userId/change-password', function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }

  var oldpass = req.body.oldPass;
  var newpass = req.body.newPass;
  if (!oldpass || !newpass || newpass.trim() === '' || oldpass === newpass) {
    return next(new ForbiddenError());
  }
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    UserModel.modifyPassword(id, oldpass, newpass, function(err, user) {
      if (err) {return next(err); }
      if (!user) {return next(new ForbiddenError()); }
      res.end();
    });
  });
});             

router.post('/reset-password', function(req, res, next) {
  var mail = req.body.email;
  if (!mail || mail.trim() === '') {return next(new ForbiddenError()); }

  var newpass = req.body.newPass;
  var field = '+password +salt +passwordreset.password';
  UserModel.findOne({email: mail}, field, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    if (user.passwordreset &&
        user.passwordreset.password &&
        user.passwordreset.password.trim() !== '') {
      return next(new ForbiddenError());
    }
    user.passwordreset = {password: newpass, token: uuid.v4()};
    user.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

router.get('/:userId/password-reset', function(req, res, next) {
  var id = req.params.userId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }

  console.log(req.query);
  var uuid = req.query.uuid;
  
  var field = '+passwordreset.password '+
      '+passwordreset.date +passwordreset.token';
  UserModel.findById(id, field, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    if (!user.passwordreset ||
        !user.passwordreset.password ||
        user.passwordreset.password.trim() === '') {
      return next(new ForbiddenError());
    }
    if (user.passwordreset.token !== uuid) {
      return next(new ForbiddenError());
    }
    user.password = user.passwordreset.password;
    user.save(function(err, data) {
      if (err) { return next(err); }
      console.log(data);
      res.end();
    });
  });  
});

module.exports = router;
