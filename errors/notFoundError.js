'use strict';

var util = require('util');

var NotFoundError = module.exports = function NotFoundError() {
  Error.call(this);
  this.message = 'Not Found';
  this.stack = (new Error()).stack;
  this.status = 404;
};

util.inherits(NotFoundError, Error);
