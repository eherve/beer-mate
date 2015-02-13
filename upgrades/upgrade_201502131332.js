'use strict';

module.exports.upgrade = function(cb) {
  var UserModel = require('../models/user');
  UserModel.findOne({ email: 'darko@beermate.io' }, '_id', function(err, user) {
    if (err) { return cb(err); }
    var PubModel = require('../models/pub');
    PubModel.update({ userId: null }, { userId: user._id }, cb);
  });
};

