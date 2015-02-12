'use strict';

var util = require('util');

var BadRequestError = module.exports = function BadRequestError() {
  Error.call(this);
  this.message = 'Bad Request';
  this.stack = (new Error()).stack;
  this.status = 400;
};

util.inherits(BadRequestError, Error);
