'use strict';

var auth = require('./auth');
var logging = require('./logging');
var user = require('./user');
var pub = require('./pub');

var Auth = require('../../tools/auth');

module.exports = function(app) {
  app.get('/admin', function(req, res) {
    Auth.adminConnected(req, res, function(err) {
      res.locals.connected = !err;
      res.render('admin/index');
    });
  });
  app.use('/admin/auth', auth);
  app.use('/admin/logging', logging);
  app.use('/admin/users', user);
  app.use('/admin/pubs', pub);
};
