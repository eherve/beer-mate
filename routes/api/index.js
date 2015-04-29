'use strict';

var Auth = require('../../tools/auth');
var auth = require('./auth');
var user = require('./user');
var pub = require('./pub');
var access = require('./access');
var connectedUser = require('./connectedUser');

module.exports = function(app) {
  app.use('/api/auth', auth);
  app.use('/api/users', user);
  app.use('/api/pubs', pub);
  app.use('/api/user', Auth.userConnected, connectedUser);
  app.use('/api/access', access);
};
