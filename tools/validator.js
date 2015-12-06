'use strict';

var validate = require('mongoose-validator');

// Mongoose validator
var mongooseValidator = {};

mongooseValidator.localeValidator = [
	validate({
		validator: 'matches',
		arguments: [ /^[A-Za-z-]*$/ ],
		passIfEmpty: true,
		message: 'error.wrong_locale'
	})
];

mongooseValidator.dayNumValidator = [
	validate({
		validator: 'isInt',
		passIfEmpty: false,
		arguments: [ { min: 0, max: 6 } ],
		message: 'error.day_num_wrong_format'
	})
];

mongooseValidator.hourValidator = [
	validate({
		validator: 'isInt',
		passIfEmpty: false,
		arguments: [ { min: 0, max: 23 } ],
		message: 'error.hour_wrong_format'
	})
];

mongooseValidator.minuteValidator = [
	validate({
		validator: 'isInt',
		passIfEmpty: false,
		arguments: [ { min: 0, max: 59 } ],
		message: 'error.minute_wrong_format'
	})
];

mongooseValidator.urlValidator = [
	validate({
		validator: 'isURL',
		arguments: [ { 'allow_underscores': true } ],
		passIfEmpty: true,
		message: 'error.url_wrong_format'
	})
];

mongooseValidator.noteValidator = [
	validate({
		validator: 'isInt',
		passIfEmpty: true,
		arguments: [ { min: 1, max: 5 } ],
		message: 'error.note_wrong_format'
	})
];

mongooseValidator.pubNameValidator = [
	validate({
		validator: 'isLength',
		arguments: [ 2, 200 ],
		message: 'error.pub_name_wrong_format'
	})
];

module.exports.mongoose = mongooseValidator;