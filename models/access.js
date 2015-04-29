'use strict';

var Schema = require('mongoose').Schema;

var schema = new Schema({
  date: { type: Date, default: Date.now, required: true },
  ip: { type: String, required: true },
  path: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Access', schema);
};
