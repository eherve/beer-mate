'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var https = require('https');
var logger = require('../../logger').get('Route');
var Auth = require('../../tools/auth');
var PubModel = require('../../models/pub');

var GOOGLE_PLACE_KEY = require('../../config/application.json')
  .google.placeKey;

router.get('/unprocessed', Auth.adminConnected, function(req, res, next) {
  var filters = { $or: [ { 'google.processed': { $exists: false } },
    { 'google.processed': false } ] };
  var fields = 'name address google.processed';
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.get('/mismatch', Auth.adminConnected, function(req, res, next) {
  var filters = { 'google.processed': true, 'google.placeId': null };
  var fields = 'name address google.processed';
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

function buildPath(query, name, loc) {
  return '/maps/api/place/radarsearch/json'
    .concat('?types=').concat('bar')
    .concat('&location=').concat(loc[1]).concat(',').concat(loc[0])
    .concat('&radius=').concat(query.radius || 50)
    .concat('&keyword=').concat(encodeURIComponent(name))
    .concat('&key=').concat(GOOGLE_PLACE_KEY);
}

function fetchPub(query, name, loc, cb) {
  var options = {
    hostname: 'maps.googleapis.com',
    port: 443,
    path: buildPath(query, name, loc),
    method: 'GET',
    rejectUnauthorized: false
  };
  logger.debug(util.format('google fetch options', options));
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var ggData = '';
    res.on('data', function(data) { ggData += data; });
    res.on('end', function() {
      if (res.statusCode === 200) {
        try {
          ggData = JSON.parse(ggData);
        } catch (err) { return cb(err); }
        cb(null, ggData);
      } else {
        logger.error('google fetch', ggData);
        var err = new Error();
        err.status = res.statusCode;
        cb(err);
      }
    });
  });
  req.end();
  req.on('error', cb);
}

router.get('/process', Auth.adminConnected, function(req, res, next) {
  var filters = { $or: [ { 'google.processed': { $exists: false } },
    { 'google.processed': false } ] };
  var fields = 'name address google';
  PubModel.find(filters, fields).limit(req.query.limit || 20)
    .exec(function(err, pubs) {
      if (err) { return next(err); }
      (function run(index) {
        if (index >= pubs.length) { return res.send(pubs); }
        fetchPub(req.query, pubs[index].name, pubs[index].address.loc,
          function(err, data) {
            if (err) { return next(err); }
            pubs[index] = pubs[index].toObject();
            pubs[index].propositions = data;
            run(++index);
          }
        );
      })(0);
  });
});

module.exports = router;