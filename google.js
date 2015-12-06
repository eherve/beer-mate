'use strict';

var util = require('util');
var https = require('https');

var logger = require('logger-factory').get('Google Places');
var Quota = require('./models/quota');
var batch = require('./batch');

var QUOTA_GOOGLE = 1000;
var GOOGLE_PLACE_KEYS = require('./config/application.json')
		.google.placeKeys || [];

var OVER_QUERY_LIMIT = module.exports.OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT';
var TYPE_GOOGLE = Quota.TYPE_GOOGLE;

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
	Quota.findOne({ type: TYPE_GOOGLE, remaining: { $gt: 0 } },
		function(err, quota) {
			if (err) { return cb(err); }
			logger.info(util.format('get key available: %s', quota));
			cb(null, quota ? quota : null);
		});
}

function fetchGooglePub(key, path, cb) {
	var options = { hostname: 'maps.googleapis.com', port: 443, method: 'GET',
		rejectUnauthorized: false, path: path };
	logger.debug(util.format('google fetch https://%s%s',
		options.hostname, options.path));
	key.consume();
	var req = https.request(options, function(res) {
		res.setEncoding('utf8');
		var data = '';
		res.on('data', function(d) { data += d; });
		res.on('end', function() {
			if (res.statusCode === OVER_QUERY_LIMIT) { return cb(res.statusCode); }
			if (res.statusCode !== 200) {
				return cb({ status: res.statusCode, message: res.error_message }); // jshint ignore:line
			}
			try { data = JSON.parse(data); }
			catch (err) { return cb(err); }
			if (['OK', 'ZERO_RESULTS'].indexOf(data.status) !== -1) {
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

function cleanName(name) {
	var cleaned = name
		.replace(/(^| |-)[ldms]'/ig, '$1')
		.replace(/\([^)]*\)/ig, '')
		.replace(/['-]/g, ' ')
		.replace(/ [ ]+/g, '');
	cleaned = encodeURIComponent(cleaned);
	return cleaned;
}

function buildNearbyPath(key, pub, options) {
	var path = '/maps/api/place/nearbysearch/json';
	if (options.types) {
		var types = ('string' === typeof options.types) ? options.types
			: options.types.join('|');
		path = path.concat('?types=').concat(types);
	} else {
		path = path.concat('?types=').concat('bar|cafe');
	}
	path = path.concat('&location=').concat(pub.address.loc[1]).concat(',')
		.concat(pub.address.loc[0])
		.concat('&radius=').concat(options.radius || 200);
	if (options.useName !== false) {
		path = path.concat('&name=').concat(cleanName(pub.name));
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

module.exports.setProcessed = function(pub, data, cb) {
	pub.google.search = new Date();
	pub.google.placeId = data ? data.place_id : null; // jshint ignore:line
	pub.save(cb);
};

/*
 * Radar search methods
 */

function buildRadarSearchPath(key, lat, lng, radius) {
	return '/maps/api/place/radarsearch/json'
		.concat('?types=').concat('bar|cafe')
		.concat('&location=').concat(lat).concat(',').concat(lng)
		.concat('&radius=').concat(radius || 1000)
		.concat('&key=').concat(key.key);
}

module.exports.radarSearchGooglePub = function(lat, lng, radius, cb) {
	getAvailableKey(function(err, key) {
		if (err) { return cb(err); }
		if (key === null) { return cb(OVER_QUERY_LIMIT); }
		fetchGooglePub(key, buildRadarSearchPath(key, lat, lng, radius),
			function (err, data) {
				if (err === OVER_QUERY_LIMIT) {
					key.empty(function(err) {
						if (err) { return cb(err); }
						module.exports.radarSearchGooglePub(lat, lng, radius, cb);
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

function syncAddress(pub, result) {
	var addressComponents = result.address_components; // jshint ignore:line
	var address = {};
	for (var index = 0; index < addressComponents.length; ++index) {
		var component = addressComponents[index];
		if (component.types.indexOf('street_number') !== -1) {
			address.streetNumber = component.long_name; // jshint ignore:line
		}
		if (component.types.indexOf('route') !== -1) {
			address.route = component.long_name; // jshint ignore:line
		}
		if (component.types.indexOf('locality') !== -1) {
			address.locality = component.long_name; // jshint ignore:line
		}
		if (component.types.indexOf('country') !== -1) {
			address.country = component.long_name; // jshint ignore:line
		}
		if (component.types.indexOf('postal_code') !== -1) {
			address.postalCode = component.long_name; // jshint ignore:line
		}
	}
	pub.address.street = address.streetNumber ?
		(address.streetNumber + ' ' + address.route) : address.route;
	pub.address.city = address.locality;
	pub.address.postalCode = address.postalCode;
	pub.address.country = address.country;
}

module.exports.syncPub = function(pub, data) {
	if (data && data.result) {
		pub.google = pub.google || {};
		pub.google.sync = new Date();
		var result = data.result;
		pub.name = result.name;
		syncAddress(pub, result);
		pub.google = pub.google || {};
		pub.google.placeId = result.place_id; // jshint ignore:line
		pub.address = pub.address || {};
		pub.address.loc =
			[ result.geometry.location.lng, result.geometry.location.lat ];
		pub.phone = result[PHONE_PARAM] || pub.phone;
		pub.webSite = result[WEBSITE_PARAM] || pub.webSite;
		if (data.result[OPEN_PERIODS_PARAM]) {
			result[OPEN_PERIODS_PARAM].periods.forEach(function (period) {
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
	}
};

/*
 * Initialization
 * Set Google Places API Keys
 */

function getMidnightPT() {
	var today = new Date();
	return new Date(Date.UTC(
		today.getFullYear(), today.getMonth(), today.getDate()));
}

var timeout = null;

function reset(cb) {
	Quota.count({ type: TYPE_GOOGLE,
			$or: [ { reset: { $exists: false } },
				{ reset: { $lt: getMidnightPT() } } ] },
		function(err, count) {
			if (err) { logger.error(err); }
			if (count > 0) {
				Quota.reset(TYPE_GOOGLE, QUOTA_GOOGLE, cb);
			} else { cb(); }
		});
}

module.exports.initialization = function(cb) {
	Quota.remove({ type: TYPE_GOOGLE, key: { $nin: GOOGLE_PLACE_KEYS } },
		function(err) {
			if (err) { return cb(err); }
			(function run(index) {
				if (index >= GOOGLE_PLACE_KEYS.length) {
					if (timeout === null) {
						return reset(function(err) {
							if (err) {
								logger.error(err);
							}
							batch.registerBatch('google quota', function(cb) {
								Quota.reset(TYPE_GOOGLE, QUOTA_GOOGLE, cb);
							}, batch.getTimeoutForMidnightPT).start();
							cb();
						});
					} else { return cb(); }
				}
				var quota = { type: TYPE_GOOGLE, key: GOOGLE_PLACE_KEYS[index],
					remaining: QUOTA_GOOGLE, reset: new Date() };
				Quota.update({ type: TYPE_GOOGLE, key: quota.key },
					{ $setOnInsert: quota }, { upsert: true }, function(err) {
						if (err) { return cb(err); }
						run(++index);
					});
			})(0);
		});
};

module.exports.reset = function(cb) {
	Quota.reset(TYPE_GOOGLE, QUOTA_GOOGLE, cb);
};

