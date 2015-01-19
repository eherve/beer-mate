'use strict';

var auth = require('./routes/auth');
var users = require('./routes/users');
var pubs = require('./routes/pubs');
var error = require('./routes/error');

module.exports = function(app) {
  app.use('/auth', auth);
  app.use('/api/users', users);
  app.use('/api/pubs', pubs);
  app.use(error);
};
