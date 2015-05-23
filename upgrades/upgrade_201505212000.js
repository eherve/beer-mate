'use strict';

module.exports.upgrade = function(cb) {
  require('../models/pub').find({}, function(err, pubs) {
    if (err) { return cb(err); }
    (function run(index) {
      if (index >= pubs.length) { return cb(); }
      var pub = pubs[index];
      if (pub.currency === 'dollar') { pub.currency = '$'; }
      else { pub.currency = '€'; }
      pub.save(function(err) {
        if (err) { return cb(err); }
        run(++index);
      });
    })(0);
  });
};
