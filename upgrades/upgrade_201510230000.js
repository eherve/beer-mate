'use strict';

var util = require('util');
var https = require('https');
var logger = require('logger-factory').get('Upgrade');

var GOOGLE_PLACE_KEY = require('../config/application.json')
	.google.placeKey;
var OPEN_PERIODS_PARAM = 'opening_hours';
var PHONE_PARAM = 'formatted_phone_number';
var WEBSITE_PARAM = 'webSite';

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
	logger.info(util.format('push period', period));
	pub.openPeriods.push(period);
}


function buildFetchPath(placeId) {
	return '/maps/api/place/details/json'
		.concat('?placeid=').concat(placeId)
		.concat('&key=').concat(GOOGLE_PLACE_KEY);
}

function buildGoogleError(res, data) {
	logger.error('google fetch', data);
	var err = new Error();
	err.status = res.statusCode;
	return err;
}

function fetchGooglePub(placeId, cb) {
	var options = {
		hostname: 'maps.googleapis.com', port: 443, method: 'GET',
		rejectUnauthorized: false,
		path: buildFetchPath(placeId)
	};
	logger.debug(util.format('google fetch options', options));
	var req = https.request(options, function(res) {
		res.setEncoding('utf8');
		var ggd = '';
		res.on('data', function(data) { ggd += data; });
		res.on('end', function() {
			if (res.statusCode === 200) {
				try { ggd = JSON.parse(ggd); }
				catch (err) { return cb(err); }
				if (['OK', 'ZERO_RESULTS'].indexOf(ggd.status) === -1) {
					return cb(buildGoogleError(res, ggd));
				}
				logger.debug(util.format('google fetch',
					util.inspect(ggd, false, null)));
				cb(null, ggd);
			} else { return cb(buildGoogleError(res, ggd)); }
		});
	});
	req.end();
	req.on('error', cb);
}

function setHappyHour(pub, period, openPeriod) {
	var day = pub.days[days[period.open.day]];
	var data = day && day.open !== undefined ? day : pub.days.default;
	if (data.happyHour) {
		openPeriod.openHH.day = period.open.day;
		openPeriod.openHH.hours = parseInt(data.openHH.substring(0, 2));
		openPeriod.openHH.minutes = parseInt(data.openHH.substring(3));
		if (openPeriod.openHH.hours < openPeriod.open.hours) {
			openPeriod.openHH.hours = openPeriod.open.hours;
			openPeriod.openHH.minutes = openPeriod.open.minutes;
		}
		if (day.openHH <= open.closeHH) {
			openPeriod.closeHH.day = period.open.day;
		} else {
			openPeriod.closeHH.day = period.close.day;
		}
		openPeriod.closeHH.hours = parseInt(data.closeHH.substring(0, 2));
		openPeriod.closeHH.minutes = parseInt(data.closeHH.substring(3));
	}
}

function updatingSyncPub(pub, data) {
	pub.google.sync = new Date();
	if (data && data.result && data.result[OPEN_PERIODS_PARAM]) {
		var result = data.result;
		pub.phone = result[PHONE_PARAM] || pub.phone;
		pub.webSite = result[WEBSITE_PARAM] || pub.webSite;
		result[OPEN_PERIODS_PARAM].periods.forEach(function(period) {
			logger.debug(util.format('google period %s', period));
			if (!period || !period.open || !period.close) { return; }
			var openPeriod = { open: {}, close: {}, openHH: {}, closeHH: {} };
			openPeriod.open.day = period.open.day;
			openPeriod.open.hours = parseInt(period.open.time.substring(0, 2));
			openPeriod.open.minutes = parseInt(period.open.time.substring(2));
			openPeriod.close.day = period.close.day;
			openPeriod.close.hours = parseInt(period.close.time.substring(0, 2));
			openPeriod.close.minutes = parseInt(period.close.time.substring(2));
			setHappyHour(pub, period, openPeriod);
			pub.openPeriods.push(openPeriod);
		});
		return true;
	}
	return false;
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
	pub.price = df.priceH;
	pub.priceHH = df.priceHH;
	if (pub.google.placeId) {
		fetchGooglePub(pub.google.placeId, function(err, data) {
			if (err) {
				console.error(err);
				updateFromPreviousModel(pub, df);
				cb();
			} else {
				if (!updatingSyncPub(pub, data)) {
					updateFromPreviousModel(pub, df);
				}
				cb();
			}
		});
	} else {
		updateFromPreviousModel(pub, df);
		cb();
	}
}

module.exports.upgrade = function(cb) {
	require('../models/pub').find({}, function(err, pubs) {
		if (err) { return cb(err); }
		var processedPub = 0;
		(function run(index) {
			if (index >= pubs.length) {
				logger.info(util.format('%s processed pub', processedPub));
				return cb();
			}
			var pub = pubs[index];
			logger.info(util.format('processing pub %s...', pub.name));
			transform(pub, function() {
				++processedPub;
				pub.save(function (err) {
					if (err) {
						return cb(err);
					}
					run(++index);
				});
			});
		})(0);
	});
};
