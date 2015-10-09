/// <reference path="../typings/node/node.d.ts"/>
'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');

var logger = require('../logger').get('Route');

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
	(function walk(base, dir) {
		var list = fs.readdirSync(dir);
		list.forEach(function(file) {
			var filePath = path.join(dir, '/', file);
			var stat = fs.statSync(filePath);
			if (stat && stat.isDirectory()) {
				walk(path.join(base, '/', file), filePath);
			} else {
				var route = require(filePath);
				if (route.name === 'router') {
					var args = [];
					if (route.path) { args.push(path.join(base, route.path)); }
					if (route.middlewares) { args = args.concat(route.middlewares); }
					args.push(route);
					logger.info(util.format(
						'load router %s', path.join(base, '/', file)));
					logger.debug(args);
					app.use.apply(app, args);
				}
			}
		});
	})('', __dirname);

  app.use(notFound);
	app.use(validationError);
  app.use(error);
};
