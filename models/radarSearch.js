'use strict';

var util = require('util');
var Schema = require('mongoose').Schema;
var logger = require('logger-factory').get('Model Radar Search');

var google = require('../google');
var batch = require('../batch');

var TempPubModel = require('./tempPub');

var TYPE_GOOGLE = 'google';
var TYPES = [ TYPE_GOOGLE ];

var radius = 2000;

var schema = new Schema({
	type: { type: String, required: true, enum: TYPES },
	processed: { type: Boolean, default: false, require: true },
	loc: { type: [ Number ], index: '2dsphere', required: true },
	radius: { type: Number, default: radius }
});

schema.statics.TYPE_GOOGLE = TYPE_GOOGLE;

var pushList = [];
var pushing = false;

schema.statics.push = function(type, data, cb) {
	if (pushing) { return pushList.push([type, data, cb]); }
	pushing = true;
	var self = this;
	var icb = function(err) {
		if (cb) { cb(err); }
		else if (err) { logger.error(err); }
		pushList.splice(0, 1);
		pushing = false;
		if (pushList.length > 0) {
			schema.statics.push.apply(self, pushList[0]);
		}
	};
	var Model = this;
	Model.findOne({
		loc: {
			$nearSphere: {
				$geometry: {
					type: 'Point', coordinates: [
						parseFloat(data.lng), parseFloat(data.lat)
					]
				},
				$maxDistance: parseFloat(data.radius || radius)
			}
		}
	}, '_id', function(err, found) {
		if (err) {
			return icb(err);
		}
		if (found) {
			return icb();
		}
		var radarSearch = new Model({ type: type, loc: [ data.lng, data.lat ],
			radius: data.radius, processed: false });
		radarSearch.save(function(err) {
			if (err) {
				return icb(err);
			}
			Model.runSync(icb);
		});
	});
};

schema.statics.pushGoogle = function(data, cb) {
	this.push(TYPE_GOOGLE, data, cb);
};

module.exports = require('../database').db.model('RadarSearch', schema);

var running = false;

function processPub(data, cb) {
	logger.debug('Registering fetched pub');
	var count = 0;
	(function run(index) {
		if (index >= data.results.length) { return cb(null, count); }
		var result = data.results[index];
		TempPubModel.update({ id: result.place_id }, // jshint ignore:line
			{ type: TempPubModel.TYPE_GOOGLE, id: result.place_id, // jshint ignore:line
				$setOnInsert: { processed: false } },
			{ upsert: true }, function(err) {
				if (err) { return cb(err, count); }
				++count;
				run(++index);
			});
	})(0);
}

function processSearch(search, cb) {
	logger.debug(util.format('process search %s', search));
	google.radarSearchGooglePub(search.loc[1], search.loc[0], search.radius,
		function(err, data) {
			if (err) { return cb(err); }
			processPub(data, function(err, count) {
				if (err) { return cb(err); }
				logger.debug(util.format('%s fetched pub registerd', count));
				TempPubModel.runSync(function(err) {
					if (err) { return cb(err); }
					search.processed = true;
					search.save(cb);
				});
			});
		}
	);
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
			processSearch(search[index], function(err) {
				if (err) {
					running = false;
					return cb(err);
				}
				run(++index);
			});
		})(0);
	});
}

var b = batch.registerBatch('radar search fetch',
	function(cb) { sync(cb); },
	function() { return batch.getTimeoutForMidnightPT() + (1000 * 60 * 5); }
).start().run();

module.exports.runSync = b.run;