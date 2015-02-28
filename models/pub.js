'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');

var nameValidator = [
  validate({
    validator: 'isLength',
    arguments: [2, 50],
    message: 'validator.name.size'
  })
];

var hourValidator = [
  validate({
    validator: 'matches',
    arguments: [ /^([01]\d|2[0-3]):?([0-5]\d)$/ ],
    passIfEmpty: true,
    message: 'validator.hour.format'
  })
];

var webSiteValidator = [
validate({
    validator: 'isURL',
    arguments: [ { 'allow_underscores': true } ],
    passIfEmpty: true,
    message: 'validator.web-site'
  })
];

var noteValidator = [
  validate({
    validator: 'isInt',
    passIfEmpty: true,
    message: 'validator.note'
  })
];

var ratingValidator = [
  validate({
    validator: 'isInt',
    passIfEmpty: true,
    message: 'validator.rating'
  })
];

var checkInSchema = new Schema({
  date: { type: Date, default: Date.now, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

var ratingSchema = new Schema({
  note: { type: Number, validate: noteValidator, required: true,
    min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

var commentSchema = new Schema({
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
  name: { type: String, required: true, validate: nameValidator },
  phone: { type: String },
  address: {
    country: { type: String, mergeable: false },
    postalCode: { type: String, mergeable: false },
    city: { type: String, mergeable: false },
    street: { type: String, mergeable: false },
    loc: { type: [ Number ], index: '2dsphere', required: true,
      mergeable: false }
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
  rating: { type: Number, validate: ratingValidator, min: 0, max: 5,
    mergeable: false },
  comments: [ commentSchema ],
  nbComments: { type: Number, min: 0, default: 0, mergeable: false },
  checkIn: [ checkInSchema ],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true,
    mergeable: false },
  enabled: { type: Boolean, default: true, required: true, mergeable: false },
  validated: { type: Boolean, default: false, required: true,
  mergeable: false },
  createdAt: { type: Date, default: Date.now, required: true,
  mergeable: false },
  updatedAt: { type: Date, default: Date.now, required: true,
  mergeable: false }
});

/*
 * Register
 */

module.exports.register = function(db) {
  module.exports = db.model('Pub', schema);
};

