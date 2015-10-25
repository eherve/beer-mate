'use strict';

var util = require('util');
var https = require('https');

var logger = require('logger-factory').get('Google Places');
var Quota = require('./models/quota');

var QUOTA_GOOGLE = 1000;
var GOOGLE_PLACE_KEYS = require('./config/application.json')
		.google.placeKeys || [];

var OVER_QUERY_LIMIT = module.exports.OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT';

var OPEN_PERIODS_PARAM = 'opening_hours';
var PHONE_PARAM = 'formatted_phone_number';
var WEBSITE_PARAM = 'webSite';

var DAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

function getAvailableKey(cb) {
	Quota.findOne({ type: Quota.TYPE_GOOGLE, remaining: { $gt: 0 } },
		function(err, quota) {
			if (err) { return cb(err); }
			cb(null, quota ? quota : null);
		});
}

function fetchGooglePub(key, path, cb) {
	var options = { hostname: 'maps.googleapis.com', port: 443, method: 'GET',
		rejectUnauthorized: false, path: path };
	logger.debug(util.format('google fetch options', options));
	key.consume();
	var req = https.request(options, function(res) {
		res.setEncoding('utf8');
		var data = '';
		res.on('data', function(d) { data += d; });
		res.on('end', function() {
			if (res.statusCode !== 200) { return cb(res.statusCode); }
			try { data = JSON.parse(data); }
			catch (err) { return cb(err); }
			if (['OK', 'ZERO_RESULTS'].indexOf(data.status) !== -1) {
				logger.debug(util.format('google fetched data',
					util.inspect(data, false, null)));
				return cb(null, data);
			}
			return cb(data.status);
		});
	});
	req.on('error', cb);
	req.end();
}

/*
 * Fetch pub methods
 */

function buildFetchPath(key, placeId) {
	return '/maps/api/place/details/json'
		.concat('?placeid=').concat(placeId)
		.concat('&key=').concat(key.key);
}

module.exports.getGooglePub = function(placeId, cb) {
	getAvailableKey(function(err, key) {
		if (err) { return cb(err); }
		if (key === null) { return cb(OVER_QUERY_LIMIT); }
		fetchGooglePub(key, buildFetchPath(key, placeId), function (err, data) {
			if (err === OVER_QUERY_LIMIT) {
				key.empty(function(err) {
					if (err) {
						return cb(err);
					}
					return module.exports.getGooglePub(placeId, cb);
				});
			} else { cb(err, data); }
		});
	});
};

/*
 * Search pub methods
 */

function buildNearbyPath(key, pub, options) {
	var path = '/maps/api/place/nearbysearch/json'
		.concat('?types=').concat('bar|restaurant')
		.concat('&location=').concat(pub.address.loc[1]).concat(',')
		.concat(pub.address.loc[0])
		.concat('&radius=').concat(options.radius || 50);
		if (options.useName !== false) {
			path = path.concat('&name=').concat(encodeURIComponent(pub.name));
		}
	path = path.concat('&key=').concat(key.key);
	return path;
}

module.exports.searchGooglePub = function(pub, options, cb) {
	options = options || {};
	getAvailableKey(function(err, key) {
		if (err) { return cb(err); }
		if (key === null) { return cb(OVER_QUERY_LIMIT); }
		fetchGooglePub(key, buildNearbyPath(key, pub, options),
			function (err, data) {
			if (err === OVER_QUERY_LIMIT) {
				key.empty(function(err) {
					if (err) { return cb(err); }
					module.exports.searchGooglePub(pub, options, cb);
				});
			} else { cb(err, data); }
		});
	});
};

/*
 * Synchronize pub methods
 */

function setHappyHour(pub, period, openPeriod) {
	var day = pub.days[DAYS[period.open.day]];
	var data = day && day.open !== undefined ? day : pub.days.default;
	if (data.happyHour && data.openHH && data.closeHH) {
		openPeriod.openHH.day = period.open.day;
		openPeriod.openHH.hours = parseInt(data.openHH.substring(0, 2));
		openPeriod.openHH.minutes = parseInt(data.openHH.substring(3));
		if (openPeriod.openHH.hours < openPeriod.open.hours) {
			openPeriod.openHH.hours = openPeriod.open.hours;
			openPeriod.openHH.minutes = openPeriod.open.minutes;
		}
		if (day.openHH <= day.closeHH) {
			openPeriod.closeHH.day = period.open.day;
		} else {
			openPeriod.closeHH.day = period.close.day;
		}
		openPeriod.closeHH.hours = parseInt(data.closeHH.substring(0, 2));
		openPeriod.closeHH.minutes = parseInt(data.closeHH.substring(3));
	}
}

module.exports.syncPub = function(pub, data) {
	if (data && data.result && data.result[OPEN_PERIODS_PARAM]) {
		pub.google.sync = new Date();
		var result = data.result;
		pub.phone = result[PHONE_PARAM] || pub.phone;
		pub.webSite = result[WEBSITE_PARAM] || pub.webSite;
		result[OPEN_PERIODS_PARAM].periods.forEach(function (period) {
			logger.debug(util.format('google period %s', JSON.stringify(period)));
			if (!period || !period.open || !period.close) {
				return;
			}
			var openPeriod = {open: {}, close: {}, openHH: {}, closeHH: {}};
			openPeriod.open.day = period.open.day;
			openPeriod.open.hours = parseInt(period.open.time.substring(0, 2));
			openPeriod.open.minutes = parseInt(period.open.time.substring(2));
			openPeriod.close.day = period.close.day;
			openPeriod.close.hours = parseInt(period.close.time.substring(0, 2));
			openPeriod.close.minutes = parseInt(period.close.time.substring(2));
			// INFO - previous model
			if (pub.days) {
				setHappyHour(pub, period, openPeriod);
			}
			pub.openPeriods.push(openPeriod);
		});
	}
};

/*
 * Initialization
 * Set Google Places API Keys
 */

module.exports.initialization = function(cb) {
	Quota.remove({ type: Quota.TYPE_GOOGLE, key: { $nin: GOOGLE_PLACE_KEYS } },
		function(err) {
			if (err) { return cb(err); }
			(function run(index) {
				if (index >= GOOGLE_PLACE_KEYS.length) {
					module.exports.startWorker();
					return cb();
				}
				var quota = { type: Quota.TYPE_GOOGLE, key: GOOGLE_PLACE_KEYS[index],
					remaining: QUOTA_GOOGLE };
				Quota.update({ type: Quota.TYPE_GOOGLE, key: quota.key },
					{ $setOnInsert: quota }, { upsert: true }, function(err) {
						if (err) { return cb(err); }
						run(++index);
					});
			})(0);
		});
};

// TODO - create a worker handler

/*
 * Worker
 * becarful this is not compatible with load balancing
 */

var timeout;

function getTimeoutForMidnightPT() {
	var today = new Date();
	var date = new Date(Date.UTC(
		today.getFullYear(), today.getMonth(), today.getDate()));
	date.setDate(date.getDate() + 1);
	return date.getTime() - today.getTime();
}

module.exports.stopWorker = function() {
	clearTimeout(timeout);
};

module.exports.startWorker = function() {
	(function run() {
		timeout = setTimeout(function () {
			logger.info('run reset quota');
			module.exports.update({type: Quota.TYPE_GOOGLE},
				{$set: {remaining: QUOTA_GOOGLE}}, {multi: true}, function (err) {
					if (err) { logger.error(err); }
					run();
				});
		}, getTimeoutForMidnightPT());
	})();
	process.onStop(module.exports.stopWorker);
};
