'use strict';

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
	pub.openPeriods.push(period);
}

function transform(pub) {
	var df = pub.days.default;
	Object.keys(pub.days).forEach(function(key) {
		var day = key === 'monday' ? 0 : key === 'tuesday' ? 1
			: key === 'wednesday' ? 2 : key === 'thursday' ? 3
			: key === 'friday' ? 4 : key === 'saturday' ? 5
			: key === 'sunday' ? 6 : -1;
		if (day === -1) { return; }
		var data = pub.days[key];
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
				console.log(processedPub, 'processed pub');
				return cb();
			}
      var pub = pubs[index];
			console.log('processing pub', pub.name, '...');
			transform(pub);
			++processedPub;
      pub.save(function(err) {
        if (err) { return cb(err); }
        run(++index);
      });
    })(0);
  });
};
