'use strict';

var validate = require('mongoose-validator');

// Mongoose validator
var mongooseValidator = module.exports.mongoose = {};

mongooseValidator.localeValidator = [
	validate({
		validator: 'matches',
		arguments: [ /^[A-Za-z-]*$/ ],
		passIfEmpty: true,
		message: 'validator.locale'
	})
];