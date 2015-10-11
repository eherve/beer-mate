'use strict';

var Schema = require('mongoose').Schema;

var schema = new Schema({
  date: { type: Date, default: Date.now, required: true },
  loc: { type: [ Number ], index: '2dsphere', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pub: { type: Schema.Types.ObjectId, ref: 'Pub', required: true }
});

module.exports = require('../database').db.model('Checkin', schema);
