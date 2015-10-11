'use strict';

var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var jade = require('jade');
var moment = require('moment');
var logger = require('logger-factory').get('Email');

var fromAddress;
var transport;

module.exports.configure = function(config) {
  config = config || {};
  fromAddress = config.fromAddress;
  transport = nodemailer.createTransport(config.options);
  transport.use('compile', htmlToText());
};

module.exports.stop = function(cb) {
  if (!transport) { return cb(); }
  transport.close(function(err) {
    if (err) { logger.error(err); }
    cb();
  });
};

function buildLocals(email, data) {
  return {
    email: email,
    data: data,
    __moment: moment
  };
}

module.exports.send = function(email, title, file, data, cb) {
  if ('function' === typeof data) { cb = data; data = {}; }
  jade.renderFile(file, buildLocals(email, data), function(err, html) {
    if (err) { logger.error(err); return cb(err); }
    transport.sendMail({
      from: fromAddress,
      to: email,
      subject: title,
      html: html
    }, function(err) {
      if (err) { logger.error(err); }
      cb();
    });
  });
};

