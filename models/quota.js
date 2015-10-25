'use strict';

var Schema = require('mongoose').Schema;
var logger = require('logger-factory').get('Model Quota');

var TYPE_GOOGLE = 'google';
var TYPES = [ TYPE_GOOGLE ];

var schema = new Schema({
	type: { type: String, required: true, enum: TYPES },
	key: { type: String, required: true },
	remaining: { type: Number, required: true }
});

schema.methods.consume = function() {
	this.model('Quota').update({ _id: this._id }, { $inc: { remaining: -1 }},
		function(err) {
			if (err) { logger.error(err); }
		}
	);
};

schema.statics.TYPE_GOOGLE = TYPE_GOOGLE;

module.exports = require('../database').db.model('Quota', schema);
