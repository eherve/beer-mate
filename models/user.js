'use strict';

var Schema = require('mongoose').Schema;
var validate = require('mongoose-validator');
var crypto = require('crypto');
var SALT_RANDOM_SIZE = 16;
var HASH_ITERATION = 420;
var HASH_LEN = 512;
var PASSWD_RANDOM_POSSIBILITIES =
'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890!@#$%*()_-+=*';

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
  passwordreset: {
    date: {type: Date, select: false},
    password: {type: String, select: false},
    token: {type: String, select: false}
  },
  salt: { type: String, select: false },
  administrator: { type: Boolean, default: false },
  validated: { type: Boolean, default: false },
  validation: {
    token: { type: String },
    expires: { type: Date }
  }
});

/*
 * Middlewares
 */
function cryptPassword(password, salt, cb) {
  if (!salt || salt === 'undefined' || salt.trim() === '') {
    try {
      // generate a salt
      salt = crypto.createHash('md5').update(
        crypto.randomBytes(SALT_RANDOM_SIZE).toString('hex')).digest('hex');
    } catch (ex) { return cb(ex); }    
  }
  crypto.pbkdf2(password, salt, HASH_ITERATION, HASH_LEN, function(err, hash) {
    if (err) { return cb(err); }
    password = (new Buffer(hash, 'binary')).toString('hex');
    cb(null, {salt: salt, password: password});
  }); 
}

schema.pre('save', function(next) {
  var user = this;

  if (!user.isModified('password') && !user.isModified('passwordreset')) {
    return next();
  }
  if (user.isModified('password') &&
      user.password === user.passwordreset.password) {
    user.passwordreset.password = null;
    user.passwordreset.token = null;
    return next();
  }
  process.nextTick(function() {
    console.log('nexttick');
    var passwordToCrypt = (user.isModified('password') ?
                           user.password :
                           user.passwordreset.password);
    cryptPassword(passwordToCrypt, user.salt, function(err, pass) {
      if (err) {return next(err); }
      user.salt = pass.salt;
      if (user.isModified('password')) {
        user.password = pass.password;
      } else {
        user.passwordreset.password = pass.password;
        user.passwordreset.date = new Date();
      }
      next();
    });
  });
});

/*
 * Statics
 */

schema.statics.generateRandomPassword = function() {
var a = PASSWD_RANDOM_POSSIBILITIES;
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

