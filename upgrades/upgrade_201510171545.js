'use strict';

var util = require('util');
var logger = require('logger-factory').get('Upgrade');

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
	var dayOpen = open > '2359' ? day + 1 : day;
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
	var period = { price: data.priceH || df.priceH };
	var open = (df.openH || data.openH).replace(':', '');
	var close = (df.closeH || data.closeH).replace(':', '');
	var parsed = parseOpenClose(day, open, close);
	period.open = parsed.open;
	period.close = parsed.close;
	if (data.happyHour !== false && (df.happyHour || data.happyHour) &&
		(df.openHH || data.openHH) && (df.closeHH || data.closeHH)) {
		period.priceHH = data.priceHH || df.priceHH || period.price;
		open = (df.openHH || data.openHH).replace(':', '');
		close = (df.closeHH || data.closeHH).replace(':', '');
		parsed = parseOpenClose(day, open, close);
		period.openHH = parsed.open;
		period.closeHH = parsed.close;
	}
	logger.info(util.format('push period', period));
	pub.openPeriods.push(period);
}

function transform(pub) {
	pub.openPeriods = [];
	var df = pub.days.default;
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
			transform(pub);
			++processedPub;
			pub.save(function(err) {
				if (err) { return cb(err); }
				run(++index);
			});
		})(0);
	});
};
