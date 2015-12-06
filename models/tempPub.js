'use strict';

var util = require('util');
var Schema = require('mongoose').Schema;
var logger = require('logger-factory').get('Model Temp Pub');

var google = require('../google');
var batch = require('../batch');
var Pub = require('./pub');

var TYPE_GOOGLE = 'google';
var TYPES = [ TYPE_GOOGLE ];

var schema = new Schema({
	type: { type: String, required: true, enum: TYPES },
	processed: { type: Boolean, default: false, required: true },
	id: { type: String, required: true, unique: true }
});

schema.statics.TYPE_GOOGLE = TYPE_GOOGLE;

module.exports = require('../database').db.model('TempPub', schema);

var running = false;

function filter(data) {
	if (!data || !data.result) {
		logger.info('skip pub because there is no data');
		return true;
	}
	data = data.result;
	if (data.icon.indexOf('bar') === -1 && data.icon.indexOf('cafe') === -1) {
		logger.info(util.format('skip pub %s because it is not a pub (%s)'),
			data.name, data.icon);
		return true;
	}
	if (data.opening_hours && data.opening_hours.periods.length > 7) { // jshint ignore:line
		logger.info(util.format('skip pub %s because there is %s open periods'),
			data.name, data.opening_hours.periods.length); // jshint ignore:line
		return true;
	}
	return false;
}

function processPub(tempPub, cb) {
	logger.debug(util.format('process pub %s', tempPub));
	Pub.findOne({ 'google.placeId': tempPub.id}, '_id', function(err, found) {
		if (err) { return cb(err); }
		if (found) {
			tempPub.processed = true;
			return tempPub.save(cb);
		}
		google.getGooglePub(tempPub.id, function(err, data) {
			if (err) { return cb(err); }
			if (filter(data)) {
				tempPub.processed = true;
				return tempPub.save(cb);
			}
			var pub = new Pub();
			google.syncPub(pub, data);
			pub.save(function(err) {
				if (err) { return cb(err); }
				tempPub.processed = true;
				tempPub.save(cb);
			});
		});
	});
}

function sync(cb) {
	if (running) { return cb(); }
	running = true;
	module.exports.find({ processed: false }, function(err, search) {
		if (err) {
			running = false;
			return cb(err);
		}
		if (search.length === 0) {
			running = false;
			return cb();
		}
		(function run(index) {
			if (index >= search.length) {
				running = false;
				return sync(cb);
			}
			processPub(search[index], function(err) {
				if (err) {
					running = false;
					return cb(err);
				}
				run(++index);
			});
		})(0);
	});
}

var b = batch.registerBatch('temp pub sync',
	function(cb) { sync(cb); },
	function() { return batch.getTimeoutForMidnightPT() + (1000 * 60 * 10); }
).start().run();

module.exports.runSync = b.run;