'use strict';

var auth = require('./auth');
var user = require('./user');
var pub = require('./pub');

module.exports = function(app) {

  app.use('/api/auth', auth);
  app.use('/api/users', user);
  app.use('/api/pubs', pub);

}
