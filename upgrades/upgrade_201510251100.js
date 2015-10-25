'use strict';

var util = require('util');
var logger = require('logger-factory').get('Upgrade');
var google = require('../google');

var OPEN_PERIODS_PARAM = 'opening_hours';

var days = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

function parseOpenClose(day, open, close) {
	var dayOpen = day;
	var dayClose = open > close ? (dayOpen === 6 ? 0 : dayOpen + 1) : dayOpen;
	return {
		open: {
			day: dayOpen,
			hours: parseInt(open.substring(0, 2)),
			minutes: parseInt(open.substring(2))
		},
		close: {
			day: dayClose,
			hours: parseInt(close.substring(0, 2)),
			minutes: parseInt(close.substring(2))
		}
	};
}

function addOpen(pub, day, df, data) {
	var period = { };
	var open = (data.openH || df.openH).replace(':', '');
	var close = (data.closeH || df.closeH).replace(':', '');
	var parsed = parseOpenClose(day, open, close);
	period.open = parsed.open;
	period.close = parsed.close;
	if (data.happyHour !== false && (df.happyHour || data.happyHour) &&
		(df.openHH || data.openHH) && (df.closeHH || data.closeHH)) {
		open = (data.openHH || df.openHH).replace(':', '');
		close = (data.closeHH || df.closeHH).replace(':', '');
		parsed = parseOpenClose(day, open, close);
		period.openHH = parsed.open;
		period.closeHH = parsed.close;
	}
	pub.openPeriods.push(period);
}

function updateFromPreviousModel(pub, df) {
	df.openH = df.openH || '00:00';
	df.closeH = df.closeH || '23:59';
	var keys = Object.keys(pub.days);
	if (keys.length === 1 && df) { keys = days; }
	keys.forEach(function (key) {
		var day = days.indexOf(key);
		if (day === -1) { return; }
		var data = pub.days[key] || {};
		if ((df.open || data.open === true) &&
			(df.openH || data.openH) && (df.closeH || data.closeH)) {
			addOpen(pub, day, df, data);
		}
	});
}

function transform(pub, cb) {
	pub.openPeriods = [];
	var df = pub.days.default;
	pub.price = df.priceH || df.priceHH;
	pub.priceHH = df.priceHH;
	if (pub.google.placeId) {
		google.getGooglePub(pub.google.placeId, function(err, data) {
			if (err) {
				logger.error(err);
				updateFromPreviousModel(pub, df);
			} else {
				if (data && data.result && data.result[OPEN_PERIODS_PARAM]) {
					google.syncPub(pub, data);
				} else {
					logger.info('no usable data in goggle model');
					updateFromPreviousModel(pub, df);
				}
			}
			cb();
		});
	} else {
		updateFromPreviousModel(pub, df);
		cb();
	}
}

function search(cb) {
	require('../models/pub').find({ $or: [
			{ 'google.placeId': { $exists: false } },
			{ 'google.placeId': null } ] },
		function(err, pubs) {
			if (err) { return cb(err); }
			var processedPub = 0;
			(function run(index) {
				if (index >= pubs.length) {
					logger.info(util.format('search %s processed pub', processedPub));
					return cb();
				}
				var pub = pubs[index];
				logger.info(util.format('search processing pub %s...', pub.name));
				google.searchGooglePub(pub, { types: ['bar', 'restaurant']},
					function(err, data) {
						if (err === google.OVER_QUERY_LIMIT) {
							logger.info(err);
							return cb();
						}
						if (err) { return cb(err); }
						if (data && data.results && data.results.length === 1) {
							pub.google.placeId = data.results[0].place_id; // jshint ignore:line
							pub.save(function (err) {
								if (err) { return cb(err); }
								run(++index);
							});
						} else { run(++index); }
					});
			})(0);
		});
}

function sync(cb) {
	require('../models/pub').find({}, function(err, pubs) {
		if (err) { return cb(err); }
		var processedPub = 0;
		(function run(index) {
			if (index >= pubs.length) {
				logger.info(util.format('sync %s processed pub', processedPub));
				return cb();
			}
			var pub = pubs[index];
			logger.info(util.format('sync processing pub %s...', pub.name));
			transform(pub, function() {
				++processedPub;
				pub.save(function (err) {
					if (err) { return cb(err); }
					run(++index);
				});
			});
		})(0);
	});
}

module.exports.upgrade = function(cb) {
	search(function(err) {
		if (err) { return cb(err); }
		sync(cb);
	});

};
