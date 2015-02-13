'use strict';

var auth = require('./auth');
var logging = require('./logging');
var user = require('./user');
var pub = require('./pub');

module.exports = function(app) {

  app.use('/admin/auth', auth);
  app.use('/admin/logging', logging);
  app.use('/admin/users', user);
  app.use('/admin/pubs', pub);

};
