'use strict';

var util = require('util');

var UnauthorizedError = module.exports = function UnauthorizedError() {
  Error.call(this);
  this.message = 'Unauthorized';
  this.stack = (new Error()).stack;
  this.status = 401;
};

util.inherits(UnauthorizedError, Error);
