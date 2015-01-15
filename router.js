'use strict';

var auth = require('./routes/auth');
var users = require('./routes/users');
var error = require('./routes/error');

module.exports = function(app) {
  app.use('/auth', auth);
  app.use('/api/users', users);
  app.use(error);
}
