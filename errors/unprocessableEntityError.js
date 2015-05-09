'use strict';

var util = require('util');

var UnprocessableEntityError = module.exports =
function BadRequestError(description) {
  Error.call(this);
  this.message = 'Unprocessable Entity';
  this.stack = (new Error()).stack;
  this.status = 422;
  this.description = description;
};

util.inherits(UnprocessableEntityError, Error);
