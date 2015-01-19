var Schema = require('mongoose').Schema,
    Model = require('mongoose').Model,
    util = require('util'),
    crypto = require('crypto'),
    SALT_RANDOM_SIZE = 16,
    HASH_ITERATION = 420,
    HASH_LEN = 512;

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

module.exports.register = function(connection, cb) {
  var model = connection.model('Pub', schema);
  cb(null, 'Pub');
}

