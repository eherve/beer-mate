'use strict';

var Schema = require('mongoose').Schema;
var Mixed = Schema.Types.Mixed;

var schema = new Schema({
  name: { type: String },
  value: { type: Mixed }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Parameter', schema);
};

