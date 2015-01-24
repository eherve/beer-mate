'use strict';

var Schema = require('mongoose').Schema;

var daySchema = {
  open: { type: Boolean },
  openH: { type: Number }, closeH: { type: Number },
  priceH: { type: Number },
  happyHour: { type: Boolean },
  openHH: { type: Number }, closeHH: { type: Number },
  priceHH: { type: Number }
};

var schema = new Schema({
  name: { type: String },
  address: {
    country: { type: String },
    postalCode: { type: String },
    city: { type: String },
    street: { type: String },
    loc: { type: [ Number ], index: '2dsphere' }
  },
  days: {
    default: daySchema,
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: daySchema,
  },
  currency: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  enabled: { type: Boolean },
  validated: { type: Boolean },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

