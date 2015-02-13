'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');

var hourValidator = [
  validate({
    validator: 'matches',
    arguments: [ /^([01]\d|2[0-3]):?([0-5]\d)$/ ],
    passIfEmpty: true,
    message: 'validator.hour'
  })
];

var webSiteValidator = [
validate({
    validator: 'isURL',
    arguments: [ { 'allow_underscores': false } ],
    passIfEmpty: true,
    message: 'validator.webSite'
  })
];

var noteValidator = [
  validate({
    validator: 'isInt',
    passIfEmpty: true,
    message: 'validator.int'
  })
];

var ratingSchema = new Schema({
  note: { type: Number, validate: noteValidator, required: true,
    min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

var commentSchema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
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
    loc: { type: [ Number ], index: '2dsphere', required: true }
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
  comments: [ commentSchema ],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enabled: { type: Boolean, default: true, required: true },
  validated: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

