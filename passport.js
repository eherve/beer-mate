'use strict';

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var UserModel = require('mongoose').model('User');

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  function(email, password, done) {
    UserModel.authenticate(email, password, function (err, user) {
      if (err && !user) { return done(err); }
      done(null, user);
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  UserModel.findById(id, done);
});
