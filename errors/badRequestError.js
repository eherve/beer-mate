'use strict';

var util = require('util');

var BadRequestError = module.exports = function BadRequestError(description) {
  Error.call(this);
  this.message = 'Bad Request';
  this.stack = (new Error()).stack;
  this.status = 400;
  this.description = description;
};

util.inherits(BadRequestError, Error);
