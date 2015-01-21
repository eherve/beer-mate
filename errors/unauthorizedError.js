'use strict';

var util = require('util');

var NotFoundError = module.exports = function NotFoundError() {
  Error.call(this);
  this.message = 'Unauthorized';
  this.stack = (new Error()).stack;
  this.status = 401;
};

util.inherits(NotFoundError, Error);
