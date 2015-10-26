'use strict';

var Schema = require('mongoose').Schema;
var logger = require('logger-factory').get('Model Quota');

var TYPE_GOOGLE = 'google';
var TYPES = [ TYPE_GOOGLE ];

var schema = new Schema({
	type: { type: String, required: true, enum: TYPES },
	key: { type: String, required: true },
	remaining: { type: Number, required: true },
	reset: { type: Date, default: null }
});

schema.methods.consume = function(cb) {
	cb = cb || function(err) { if (err) { logger.error(err); } };
	this.model('Quota').update({ _id: this._id },
		{ $inc: { remaining: -1 }}, cb);
};

schema.methods.empty = function(cb) {
	cb = cb || function(err) { if (err) { logger.error(err); } };
	this.model('Quota').update({ _id: this._id },
		{ $set: { remaining: 0 }}, cb);
};

schema.statics.reset = function(type, value, cb) {
	cb = cb || function(err) { if (err) { logger.error(err); } };
	this.model('Quota').update({ type: type },
		{ $set: { remaining: value, reset: new Date() } },
		{ multi: true }, cb);
};

schema.statics.TYPE_GOOGLE = TYPE_GOOGLE;

module.exports = require('../database').db.model('Quota', schema);
