'use strict';

var Schema = require('mongoose').Schema;
var validator = require('../tools/validator').mongoose;

var localeSchema = {
	_id: { type: String, required: true, unique: true,
		validate: validator.localeValidator },
	name: { type: String, required: true },
	data: { type: String, required: true }
};

var versionSchema = {
	_id: { type: String, required: true, unique: true},
	creationDate: { type: Date, required: true, mergeable: false },
	modificationDate: { type: Date, required: true, mergeable: false},
	locales: [ localeSchema ]
};

var schema = new Schema({
	_id: { type: String, required: true, unique: true },
	versions: [ versionSchema ]
});

/*
 * Register
 */
module.exports.register = function(db) {
	module.exports = db.model('WebContent', schema);
};
