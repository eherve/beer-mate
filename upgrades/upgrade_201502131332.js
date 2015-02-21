'use strict';

module.exports.upgrade = function(cb) {
  var UserModel = require('../models/user');
  UserModel.findOne({ email: 'darko@beermate.io' }, '_id', function(err, user) {
    if (err) { return cb(err); }
    var PubModel = require('../models/pub');
    PubModel.find({}, function(err, pubs) {
      if (err) { return cb(err); }
      (function run(index) {
        if (index >= pubs.length) { return cb(); }
        var pub = pubs[index];
        if (pub.userId) { return run(++index); }
        pub.userId = user._id;
        pub.save(function(err) {
          if (err) { return cb(err); }
          run(++index);
        });
      })(0);
    });
  });
};

