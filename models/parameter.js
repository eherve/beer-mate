'use strict';

var Schema = require('mongoose').Schema;
var Mixed = Schema.Types.Mixed;

var schema = new Schema({
  name: { type: String },
  value: { type: Mixed }
});

module.exports = require('../database').db.model('Parameter', schema);

