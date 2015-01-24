'use strict';

var Schema = require('mongoose').Schema;

var hourMatch = [ /[0-9]{2}:[03]0/,
  'Invalid hour format ({VALUE}) for {PATH}.'
];

var daySchema = {
  open: { type: Boolean },
  openH: { type: String, match: hourMatch },
  closeH: { type: String, match: hourMatch },
  priceH: { type: Number },
  happyHour: { type: Boolean },
  openHH: { type: String, match: hourMatch },
  closeHH: { type: String, match: hourMatch },
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

