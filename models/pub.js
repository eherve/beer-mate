'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');

var hourValidator = validate({
  passIfEmpty: true,
  validator: 'matches',
  arguments: [ /^([01]\d|2[0-3]):?([0-5]\d)$/ ],
  message: 'validator.hour'
});

var webSiteValidator = [
  validate({
	passIfEmpty: true,
    validator: 'isURL',
    arguments: [ { 'allow_underscores': false } ],
    message: 'validator.webSite'
  })
];

var noteValidator = [
  validate({
    validator: 'isInt',
    message: 'validator.int'
  }),
  validate({
    validator: 'isLength',
    arguments: [ 0, 5 ],
    message: 'validator.length'
  })
];

var ratingSchema = new Schema({
  note: { type: Number, validate: noteValidator },
  message: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

var commentSchema = new Schema({
  title: { type: String },
  message: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
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
  comments: [ commentSchema ],
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

