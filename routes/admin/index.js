'use strict';

var Auth = require('../../tools/auth');
require('./logging');
var logger = require('./logger');

module.exports = function(app) {
  app.use('/admin/logger', Auth.adminConnected, logger);
};
