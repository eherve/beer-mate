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

function buildFetchPath(key, placeId) {
	return '/maps/api/place/details/json'
		.concat('?placeid=').concat(placeId)
		.concat('&key=').concat(key.key);
}

function fetchGooglePub(key, placeId, cb) {
	var options = { hostname: 'maps.googleapis.com', port: 443, method: 'GET',
		rejectUnauthorized: false, path: buildFetchPath(key, placeId) };
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

module.exports.fetchGooglePub = function(placeId, cb) {
	getAvailableKey(function(err, key) {
		if (err) { return cb(err); }
		if (key === null) { return cb(OVER_QUERY_LIMIT); }
		fetchGooglePub(key, placeId, function (err, data) {
			if (err === OVER_QUERY_LIMIT) { return fetchGooglePub(placeId, cb); }
			cb(err, data);
		});
	});
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
