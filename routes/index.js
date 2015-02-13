'use strict';

var logger = require('../logger').get('Route');
var api = require('./api');
var admin = require('./admin');

module.exports = function(app) {

  api(app);
  admin(app);

  // Not found
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // Error
  app.use(function(err, req, res, next) { // jshint ignore:line
    var status = err.status || (err.name === 'ValidationError' ? 400 : 500);
    if (status === 500) { logger.error(err.message, err); }
    else { logger.debug(err.message, err); }
    res.status(status);
    res.send(process.env.NODE_ENV === 'development' ? err : null);
  });

};
