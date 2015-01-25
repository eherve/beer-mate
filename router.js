'use strict';

var util = require('util');
var logger = require('./logger').get('Route');
var auth = require('./routes/auth');
var users = require('./routes/users');
var pubs = require('./routes/pubs');
var admin = require('./routes/admin');

module.exports = function(app) {
  app.use('/api/auth', auth);
  app.use('/api/users', users);
  app.use('/api/pubs', pubs);
  app.use('/admin', admin);
  // Not found
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });
  // Error
  app.use(function(err, req, res, next) { // jshint ignore:line
    if (!err.status || err.status === 500) { logger.error(err.message, err); }
    else { logger.debug(err.message, err); }
    res.status(err.status || 500);
    res.send(process.env.NODE_ENV === 'development' ? err : null);
  });
};
