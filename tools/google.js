'use strict';

var util = require('util');
var https = require('https');

var logger = require('logger-factory').get('Google Places');

var KEY_RENEW_TIME = 1000 * 60 * 60 * 24;
var KEY_QUOTA = 1000;
var GOOGLE_PLACE_KEYS = require('../config/application.json')
	.google.placeKeys || [];
var keys = module.exports.keys = [];
GOOGLE_PLACE_KEYS.forEach(function(key) {
	keys.push({ key: key, quota: KEY_QUOTA, consumed: null });
});

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

function getNextKey() {
	for (var index = 0; index < keys.length; ++index) {
		var key = keys[index];
		if (key.quota) {
			return key;
		}
		if (key.consumed && key.consumed <= Date.now() - KEY_RENEW_TIME) {
			key.consumed = null;
			key.quota = KEY_QUOTA;
			return key;
		}
	}
	return null;
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
	key.quota = key.quota - 1;
	var req = https.request(options, function(res) {
		res.setEncoding('utf8');
		var data = '';
		res.on('data', function(d) { data += data; });
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
	var key = getNextKey();
	if (key === null) {
		return cb(OVER_QUERY_LIMIT);
	}
	fetchGooglePub(key, placeId, function(err, data) {
		if (err === OVER_QUERY_LIMIT) { return fetchGooglePub(placeId,  cb); }
		if (err) { return cb(err); }
		cb(null, data);
	});
}