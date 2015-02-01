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
    country: { type: String, mergeable: false },
    postalCode: { type: String, mergeable: false },
    city: { type: String, mergeable: false },
    street: { type: String, mergeable: false },
    loc: { type: [ Number ], index: '2dsphere', mergeable: false }
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
  userId: { type: Schema.Types.ObjectId, ref: 'User', mergeable: false },
  enabled: { type: Boolean, mergeable: false },
  validated: { type: Boolean, mergeable: false },
  createdAt: { type: Date, mergeable: false },
  updatedAt: { type: Date, mergeable: false },
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

