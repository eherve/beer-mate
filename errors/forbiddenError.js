'use strict';

var util = require('util');

var ForbiddenError = module.exports =
	function ForbiddenError(description) {
		Error.call(this);
		this.message = 'Forbidden';
		this.stack = (new Error()).stack;
		this.status = 403;
		this.description = description;
	};

util.inherits(ForbiddenError, Error);
