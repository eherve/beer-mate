'use strict';

var util = require('util');

var ForbiddenError = module.exports = function ForbiddenError() {
  Error.call(this);
  this.message = 'Forbidden';
  this.stack = (new Error()).stack;
  this.status = 403;
};

util.inherits(ForbiddenError, Error);
