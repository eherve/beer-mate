'use strict';

var Auth = require('../../tools/auth');
require('./logging');
var logger = require('./logger');
var user = require('./user');

module.exports = function(app) {
  app.use('/admin/logger', Auth.adminConnected, logger);
  app.use('/admin/user', Auth.adminConnected, user);
};
