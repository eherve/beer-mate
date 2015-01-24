'use strict';

module.exports.upgrade = function(cb) {
  var UserModel = require('../models/user');
  var user = new UserModel({
    email: 'admin@beermate.com', password: 'admin'
  });
  user.save(cb);
};
