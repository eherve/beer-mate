'use strict';

var util = require('util');
var logger = require('logger-factory').get('Batch Handler');

var batch = {};

function getMidnightPT() {
	var today = new Date();
	return new Date(Date.UTC(
		today.getFullYear(), today.getMonth(), today.getDate()));
}

module.exports.getTimeoutForMidnightPT = function() {
	var today = new Date();
	var date = getMidnightPT();
	date.setDate(date.getDate() + 1);
	return date.getTime() - today.getTime();
};

module.exports.registerBatch = function(name, fct, time) {
	logger.info(util.format('register %s', name));
	var b = { fct: fct, time: time,
		run: function(cb) {
			module.exports.runBatch(name, cb);
			return this;
		},
		start: function() {
			module.exports.startBatch(name);
			return this;
		}, stop: function() {
			module.exports.stopBatch(name);
			return this;
		}
	};
	batch[name] = b;
	return b;
};

module.exports.stopBatch = function(name) {
	var b = batch[name];
	if (b && b.timeout) {
		logger.info(util.format('stop %s', name));
		clearTimeout(b.timeout);
	}
	return b;
};

function exec(name, b, next) {
	logger.info(util.format('exec %s', name));
	b.fct(function(err) {
		if (err) { logger.error(name, err); }
		if (next) { next(); }
	});
}

module.exports.startBatch = function(name) {
	var b = batch[name];
	if (!b) { return logger.error(util.format('unknown batch %s', name)); }
	if (b.timeout) { return; }
	logger.info(util.format('start %s', name));
	(function run() {
		if (b.timeout) { clearTimeout(b.timeout); }
		b.timeout = setTimeout(function () {
			exec(name, b, run);
		}, typeof b.time === 'function' ? b.time() : b.time);
	})();
	process.onStop(function() {
		module.exports.stopBatch(name);
	});
	return b;
};

module.exports.runBatch = function(name, cb) {
	var b = batch[name];
	if (!b) { logger.error(util.format('unknown batch %s', name)); }
	logger.info(util.format('run %s', name));
	exec(name, b, cb);
	return b;
};

