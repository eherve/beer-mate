'use strict';

function modifyUser(email, firstname, lastname) {
  return function(cb) {
    var UserModel = require('../models/user');
    UserModel.findOne({ email: email }, '_id', function(err, user) {
      if (err) { return cb(err); }
      user.firstname = firstname;
      user.lastname = lastname;
      user.save(cb);
    });
  };
}

var actions = [
  modifyUser('darko@beermate.io', 'Darko', 'Kuzmanovski'),
  modifyUser('eherve@beermate.io', 'Eric', 'Herve'),
  modifyUser('fregux@beermate.io', 'François-Régis', 'Robert')
];

module.exports.upgrade = function(cb) {
  (function run(index) {
    if (index >= actions.length) { return cb(); }
    actions[index](function(err) {
      if (err) { return cb(err); }
      run(++index);
    });
  })(0);
};
