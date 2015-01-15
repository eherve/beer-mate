'use strict';

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var users = require('./routes/users').USERS;

passport.use(new LocalStrategy(
  function(username, password, done) {
    for (var index = 0; index < users.length; ++index) {
      var user = users[index];
      if (user.username === username && user.password === password) {
        return done(null, user);
      }
      done(null, false);
    }
  })
);

passport.serializeUser(function(user, done) {
console.log(user);
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  for (var index = 0; index < users.length; ++index) {
    var user = users[index];
    if (user.id === id) { return done(null, user); }
  }
  done();
});
