'use strict';

var auth = require('./auth');
var logger = require('./logger');
var logging = require('./logging');
var user = require('./user');
var pub = require('./pub');
var parameter = require('./parameter');

var Auth = require('../../tools/auth');

module.exports = function(app) {
  app.get('/admin', function(req, res) {
    Auth.adminConnected(req, res, function(err) {
      res.locals.connected = !err;
      res.render('admin/index');
    });
  });
  app.use('/admin/auth', auth);
  app.use('/admin/logger', logger);
  app.use('/admin/logging', logging);
  app.use('/admin/users', user);
  app.use('/admin/pubs', pub);
  app.use('/admin/parameters', parameter);
};
