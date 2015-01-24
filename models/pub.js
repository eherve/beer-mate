'use strict';

var DAYS = [ 'default', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' ];
var Schema = require('mongoose').Schema;

var daySchema = new Schema({
  name: { type: String, enum: DAYS },
  open: { type: Boolean },
  startHour: { type: Number },
  endHour: { type: Number },
  price: { type: Number },
  happyHour: { type: Boolean },
  startHourHH: { type: Number },
  endHourHH: { type: Number },
  priceHH: { type: Number }
});

var schema = new Schema({
  name: { type: String },
  address: {
    country: { type: String },
    postalCode: { type: String },
    city: { type: String },
    street: { type: String },
    loc: { type: [ Number ], index: '2dsphere' }
  },
  open: [ daySchema ],
  currency: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  enabled: { type: Boolean },
  validated: { type: Boolean },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

/*
 * Statics
 */
schema.statics.DAYS = DAYS;

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

