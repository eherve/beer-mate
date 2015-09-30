/// <reference path="../typings/node/node.d.ts"/>
'use strict';

var logger = require('../logger').get('Route Error');
var api = require('./api');
var admin = require('./admin');

function notFound(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
}

function validationError(err, req, res, next) {
	if (err.name === 'ValidationError') {
		err.status = 400;
		err.description = 'error.validation_failed';
	}
	next(err);
}

function error(err, req, res, next) { // jshint ignore:line
	var status = err.status || 500;
  if (status === 500) { logger.error(err.message, err); }
	else { logger.debug(err.message, err); }
	var data = err;
	if (process.env.NODE_ENV !== 'development') {
		data = { description: err.description };
		if (err.errors) { data.errors = err.errors; }
	}
  res.status(status);
  res.send(data);
}

module.exports = function(app) {
  api(app);
  admin(app);
  app.use(notFound);
	app.use(validationError);
  app.use(error);
};
