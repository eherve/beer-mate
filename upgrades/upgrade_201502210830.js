'use strict';

module.exports.upgrade = function(cb) {
  require('../models/pub').find({}, function(err, pubs) {
    if (err) { return cb(err); }
    (function run(index) {
      if (index >= pubs.length) { return cb(); }
      var pub = pubs[index];
      pub.comments = pub.comments || [];
      pub.nbComments = pub.comments.length;
      pub.save(function(err) {
        if (err) { return cb(err); }
        run(++index);
      });
    })(0);
  });
};
