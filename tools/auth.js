'use strict';

var util = require('util');
var uuid = require('node-uuid');
var redis = require('../redis');
var logger = require('logger-factory').get('Route');
var UnauthorizedError = require('../errors/unauthorizedError');
var ForbiddenError = require('../errors/forbiddenError');
var UserModel = require('../models/user');

var TOKEN_NAME = 'auth_token';

function getRedisData(token, cb) {
  redis.get(token, function(err, data) {
    if (err) { return cb(err); }
    if (!data) { return cb(new UnauthorizedError()); }
    cb(null, data);
  });
}

module.exports.getToken = function(req) {
  return req.query[TOKEN_NAME];
};

module.exports.sendToken = function(req, res, token) {
  var data = { userId: req.user._id, administrator: req.user.administrator,
    locale: req.user.locale };
  data[TOKEN_NAME] = token;
  res.send(data);
};

module.exports.login = function(req, res, next) {
  var token = uuid.v4();
  redis.register(token, req.user._id, function(err) {
    if (err) { return next(err); }
    module.exports.sendToken(req, res, token);
  });
};

module.exports.logout = function(req, res, next) {
  var token = module.exports.getToken(req);
  redis.unregister(token, function(err) {
    if (err) { return next(err); }
    res.set(TOKEN_NAME, undefined).end();
  });
};

module.exports.userConnected = function(req, res, next) {
  var token = module.exports.getToken(req);
  if (!token) { return next(new UnauthorizedError()); }
  getRedisData(token, function(err, data) {
    if (err) { return next(err); }
    UserModel.findById(data.id, function(err, user) {
      if (err) { next(err); }
      if (!user) {
        logger.warn(util.format('remove token %s of unknown user %s',
          token, data.id));
        redis.unregister(token, function(err) {
          if (err) { logger.error(err); }
        });
        return next(new UnauthorizedError());
      }
      req.redisData = data; req.redisData.token = token; req.user = user;
      next();
    });
  });
};

module.exports.isAdmin = function(req) {
  return req.user.administrator === true;
};

module.exports.adminConnected = function(req, res, next) {
  module.exports.userConnected(req, res, function(err) {
    if (err) { return next(err); }
    if (!module.exports.isAdmin(req)) { return next(new ForbiddenError()); }
    next();
  });
};
