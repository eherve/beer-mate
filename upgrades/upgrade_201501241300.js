'use strict';

module.exports.upgrade = function(cb) {
  var UserModel = require('../models/user');
  UserModel.findOne({ email: 'admin@beermate.com' }, function(err, user) {
    if (err) { return (err); }
    user.administrator = true;
    user.save(cb);
  });
};

