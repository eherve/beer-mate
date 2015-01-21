'use strict';

var Schema = require('mongoose').Schema;

var schema = new Schema({
  name: { type: String },
  address: { type: String },
  actived: { type: Boolean },
  checked: { type: Boolean },
  hourHS: { type: Date },
  hourHE: { type: Date },
  open: { type: Boolean },
  price: { type: Number },
  priceHH: { type: Number },
  loc: { type: [ Number ], index: '2dsphere'},
  createdAt: { type: Date },
  updatedAt: { type: Date },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

