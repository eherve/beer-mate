'use strict';

var util = require('util');

var UnauthorizedError = module.exports =
	function UnauthorizedError(description) {
		Error.call(this);
		this.message = 'Unauthorized';
		this.stack = (new Error()).stack;
		this.status = 401;
		this.description = description;
	};

util.inherits(UnauthorizedError, Error);
