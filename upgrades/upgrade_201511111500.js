'use strict';

var util = require('util');
var logger = require('logger-factory').get('Upgrade');

module.exports.upgrade = function(cb) {
  require('../models/pub').find({ $or: [
			{ currency: { $exists: false } },
			{ currency: null }
		] },
		function(err, pubs) {
    if (err) { return cb(err); }
    (function run(index) {
      if (index >= pubs.length) { return cb(); }
      var pub = pubs[index];
			logger.info(util.format('Process pub %s with currency: %s',
				pub.name, pub.currency));
			pub.currency = '€';
      pub.save(function(err) {
        if (err) { return cb(err); }
        run(++index);
      });
    })(0);
  });
};