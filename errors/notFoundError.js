'use strict';

var util = require('util');

var NotFoundError = module.exports =
	function NotFoundError(description) {
		Error.call(this);
		this.message = 'Not Found';
		this.stack = (new Error()).stack;
		this.status = 404;
		this.description = description;
	};

util.inherits(NotFoundError, Error);
