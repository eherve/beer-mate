'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');
var crypto = require('crypto');
var SALT_RANDOM_SIZE = 16;
var HASH_ITERATION = 420;
var HASH_LEN = 512;

var emailValidator = [
  validate({
    validator: 'isEmail',
    message: 'validator.email'
  })
];

var schema = new Schema({
  name: { type: String },
  surname: { type: String },
	email: { type: String, required: true, validate: emailValidator },
  password: { type: String, select: false, required: true },
  salt: { type: String, select: false },
  administrator: { type: Boolean, default: false },
  validated: { type: Boolean, default: false },
});

/*
 * Middlewares
 */

schema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) { return next(); }
  process.nextTick(function() {
  var salt;
    try {
      // generate a salt
      salt = user.salt = crypto.createHash('md5').update(
        crypto.randomBytes(SALT_RANDOM_SIZE).toString('hex')).digest('hex');
    } catch (ex) { return next(ex); }
    // hash password
    crypto.pbkdf2(user.password, salt, HASH_ITERATION, HASH_LEN,
      function(err, hash) {
        if (err) { return next(err); }
        user.password = (new Buffer(hash, 'binary')).toString('hex');
        next();
      });
  });
});

/*
 * Statics
 */

schema.statics.generateRandomPassword = function() {
  var a = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890!@#$%*()_-+=*';
  var pass = '';
  for (var index = 0; index < 10; ++index) {
    pass += a[parseInt((Math.random() * 1000) % a.length)];
  }
  return pass;
};

schema.statics.modifyPassword = function(id, oldPassword, newPassword, cb) {
  this.findById(id, '+password +salt', function(err, user) {
    if (err) { return cb(err); }
    if (!user) { return cb(new Error('User not found !')); }
    user.comparePassword(oldPassword, function(err, valid) {
      if (err) { return cb(err); }
      if (!valid) { return cb(); }
      user.password = newPassword;
      user.save(cb);
    });
  });
};

schema.statics.authenticate = function(email, password, cb) {
  this.findOne({ email: email }, '+password +salt administrator')
  .exec(function(err, user) {
    if (err) { return cb(err); }
    if (!user) { return cb(); }
    user.comparePassword(password, function(err, valid) {
      if (err) { return cb(err); }
      if (!valid) { return cb(); }
      cb(null, user);
    });
  });
};

/*
 * Methods
 */

schema.methods.comparePassword = function(password, cb) {
  if (!password || password.length === 0) { cb(null, false); }
  var hashPassword = this.password;
  crypto.pbkdf2(password, this.salt, HASH_ITERATION, HASH_LEN,
    function(err, hash) {
      if (err) { return cb(err); }
      cb(null, hashPassword ===
        (new Buffer(hash, 'binary')).toString('hex'));
    }
  );
};

/*
 * Register
 */

module.exports.register = function(connection) {
  module.exports = connection.model('User', schema);
};

