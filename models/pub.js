'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');

var hourValidator = validate({
  validator: 'matches',
  arguments: [ /[0-9]{2}:[03]0/ ],
  message: 'validator.hour'
});

var webSiteValidator = [
  validate({
    validator: 'isURL',
    arguments: [ { 'allow_underscores': false } ],
    message: 'validator.webSite'
  })
];

var ratingSchema = new Schema({
  note: { type: Number },
  message: { type: String }
});

var daySchema = {
  open: { type: Boolean },
  openH: { type: String, validate: hourValidator },
  closeH: { type: String, validate: hourValidator },
  priceH: { type: Number },
  happyHour: { type: Boolean },
  openHH: { type: String, validate: hourValidator },
  closeHH: { type: String, validate: hourValidator },
  priceHH: { type: Number }
};

var schema = new Schema({
  name: { type: String },
  phone: { type: String },
  address: {
    country: { type: String },
    postalCode: { type: String },
    city: { type: String },
    street: { type: String },
    loc: { type: [ Number ], index: '2dsphere' }
  },
  webSite: { type: String, validate: webSiteValidator },
  days: {
    default: daySchema,
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: daySchema
  },
  currency: { type: String },
  ratings: [ ratingSchema ],
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  enabled: { type: Boolean },
  validated: { type: Boolean },
  createdAt: { type: Date },
  updatedAt: { type: Date }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

