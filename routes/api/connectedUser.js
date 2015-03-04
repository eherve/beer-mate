'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var BadRequestError = require('../../errors/badRequestError');
var ForbiddenError = require('../../errors/forbiddenError');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');

var ALLOWED_UPDATE_FIELD = 'firstname lastname';

router.get('/', function(req, res, next) {
  var id = req.redisData.id;
  UserModel.findById(id, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    res.send(user);
  });
});

router.post('/', function(req, res, next) {
  var id = req.redisData.id;
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

router.get('/favorites', function(req, res, next) {
  var id = req.redisData.id;
  UserModel.findOne({ _id: new ObjectId(id) }, function(err, user) {
    if (err) { return next(err); }
    if (!user) { return next(new NotFoundError()); }
    res.send(user.favorites);
  });
});

router.post('/favorites', function(req, res, next) {
  var id = req.redisData.id;
  if (!req.body.pubId || !ObjectId.isValid(req.body.pubId)) {
    return next(new BadRequestError());
  }
  UserModel.update({ _id: id },
    { $addToSet: { favorites: { _id: new ObjectId(req.body.pubId) } } },
    function(err) {
      if (err) { return next(err); }
      res.end();
    }
  );
});

router.delete('/favorites', function(req, res, next) {
  var id = req.redisData.id;
  UserModel.update({ _id: id },
    { $pull: { favorites: new ObjectId(req.body.pubId) } },
    function(err) {
      if (err) { return next(err); }
      res.end();
    }
  );
});

/* Change password */
router.post('/change-password', function(req, res, next) {
  var id = req.redisData.id;
  var oldpass = req.body.oldPass;
  var newpass = req.body.newPass;
  if (!oldpass || !newpass || newpass.trim() === '' || oldpass === newpass) {
    return next(new BadRequestError());
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


module.exports = router;