'use strict';

var appConfig = require('../config/application.json');
var logger = require('../logger').get('Route');
var AccessModel = require('../models/access');

module.exports.log = function(req, res, next) {
  if (appConfig.accessLog === true) {
    var access = new AccessModel({ ip: req.ip, path: req.path,
      userId: req.redisData && req.redisData.id });
    access.save(function(err) { if (err) { logger.error(err); } });
  }
  next();
};
