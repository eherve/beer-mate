'use strict';

var util = require('util');
var express = require('express');
var ObjectId = require('mongoose').Types.ObjectId;
var router = express.Router();
var https = require('https');
var NotFoundError = require('../../errors/notFoundError');
var logger = require('../../logger').get('Route');
var Auth = require('../../tools/auth');
var PubModel = require('../../models/pub');

var GOOGLE_PLACE_KEY = require('../../config/application.json')
  .google.placeKey;
var PLACE_ID_PARAM = 'place_id';

router.get('/unprocessed', Auth.adminConnected, function(req, res, next) {
  var filters = { $or: [ { 'google.processed': { $exists: false } },
    { 'google.processed': false } ] };
  var fields = 'name address google';
  var query = PubModel.find(filters, fields);
  if (req.query.limit) { query.limit(req.query.limit); }
  if (req.query.skip) { query.skip(req.query.skip); }
  query.exec(function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.get('/mismatch', Auth.adminConnected, function(req, res, next) {
  var filters = { 'google.processed': true, 'google.placeId': null };
  var fields = 'name address google';
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

function buildPath(query, name, address) {
  var path = '/maps/api/place/nearbysearch/json'
    .concat('?types=').concat('bar')
    .concat('&location=').concat(address.loc[1]).concat(',')
    .concat(address.loc[0])
    .concat('&radius=').concat(query.radius || 50);
  if (name) {
    path = path.concat('&name=').concat(encodeURIComponent(name));
  }
  path = path.concat('&key=').concat(GOOGLE_PLACE_KEY);
  return path;
}

function buildGoogleError(res, data) {
  logger.error('google fetch', data);
  var err = new Error();
  err.status = res.statusCode;
  return err;
}

function fetchGooglePub(query, name, address, cb) {
  var options = {
    hostname: 'maps.googleapis.com', port: 443, method: 'GET',
    path: buildPath(query, name, address), rejectUnauthorized: false
  };
  logger.debug(util.format('google fetch options', options));
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var ggd = '';
    res.on('data', function(data) { ggd += data; });
    res.on('end', function() {
      if (res.statusCode === 200) {
        try { ggd = JSON.parse(ggd); }
        catch (err) { return cb(err); }
        if (['OK', 'ZERO_RESULTS'].indexOf(ggd.status) === -1) {
          return cb(buildGoogleError(res, ggd));
        }
        logger.debug('google fetch', ggd);
        cb(null, ggd);
      } else { return cb(buildGoogleError(res, ggd)); }
    });
  });
  req.end();
  req.on('error', cb);
}

function updatingPub(pub, data, cb) {
  pub.google.processed = true;
  pub.google.processTime = new Date();
  if (data && data.results && data.results.length === 1) {
    pub.google.placeId = data.results[0][PLACE_ID_PARAM];
  }
  pub.save(cb);
}

router.get('/process', Auth.adminConnected, function(req, res, next) {
  var filters = { $or: [ { 'google.processed': { $exists: false } },
    { 'google.processed': false } ] };
  var fields = 'name address google';
  var query = PubModel.find(filters, fields);
  if (req.query.limit) { query.limit(req.query.limit); }
  query.exec(function(err, pubs) {
    if (err) { return next(err); }
    (function run(index) {
      if (index >= pubs.length) { return res.send(pubs); }
      var pub = pubs[index];
      fetchGooglePub(req.query, pub.name, pub.address,
        function(err, data) {
          if (err) { return next(err); }
          updatingPub(pub, data, function(err) {
            if (err) { logger.error('google processing pub', err); }
            run(++index);
          });
        }
      );
    })(0);
  });
});

router.get('/match/:pubId', Auth.adminConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  var fields = 'name address google';
  PubModel.findById(id, fields, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    fetchGooglePub(req.query, null, pub.address,
      function(err, data) {
        if (err) { return next(err); }
        res.send({ pub: pub, match: data });
      }
    );
  });
});

module.exports = router;