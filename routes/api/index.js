'use strict';

var Auth = require('../../tools/auth');
var auth = require('./auth');
var user = require('./user');
var pub = require('./pub');
var connectedUser = require('./connectedUser');
var checkin = require('./checkin');
var google = require('./google');
var webContent = require('./webContent');

module.exports = function(app) {
  app.use('/api/auth', auth);
  app.use('/api/users', user);
  app.use('/api/pubs', pub);
  app.use('/api/user', Auth.userConnected, connectedUser);
  app.use('/api/checkin', checkin);
  app.use('/api/google', google);
	app.use('/api/web-content', webContent);
};
