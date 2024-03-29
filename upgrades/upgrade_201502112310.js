'use strict';

function modifyAccount(cb) {
  var UserModel = require('../models/user');
  UserModel.findOne({ email: 'admin@beermate.com' }, function(err, user) {
    if (err) { return cb(err); }
    user.email = 'darko@beermate.io';
    user.password = 'darko42';
    user.validated = true;
    user.firstname = 'Darko';
    user.lastname = 'Kuzmanovski';
    user.save(cb);
  });
}

function createAccount(cb) {
  var UserModel = require('../models/user');
  var user = new UserModel({
    email: 'fregux@beermate.io', password: 'fregux42',
    administrator: true, validated: true,
    firstname: 'François-Régis', lastname: 'Robert'
  });
  user.save(function(err) {
    if (err) { return cb(err); }
    user = new UserModel({
      email: 'eherve@beermate.io', password: 'eherve42',
      administrator: true, validated: true,
      firstname: 'Eric', lastname: 'Hervé'
    });
    user.save(cb);
  });
}

var actions = [ modifyAccount, createAccount ];

module.exports.upgrade = function(cb) {
  (function run(index) {
    if (index >= actions.length) { return cb(); }
    actions[index](function(err) {
      if (err) { return cb(err); }
      run(++index);
    });
  })(0);
};

