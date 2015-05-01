'use strict';

var Auth = require('../../tools/auth');
var auth = require('./auth');
var user = require('./user');
var pub = require('./pub');
var connectedUser = require('./connectedUser');

module.exports = function(app) {
  app.use('/api/auth', auth);
  app.use('/api/users', user);
  app.use('/api/pubs', pub);
  app.use('/api/user', Auth.userConnected, connectedUser);
};
