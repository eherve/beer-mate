'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var viewRouter = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');

function addLocalizationFilter(filters, query) {
  if (query.longitude === undefined ||
  query.latitude === undefined) { return; }
  filters['address.loc'] = {
    $nearSphere: {
      $geometry: {
        type : 'Point', coordinates : [
          parseFloat(query.longitude), parseFloat(query.latitude)
        ]
      }
    }
  };
  if (query.maxDistance !== undefined) {
    filters['address.loc'].$nearSphere.$maxDistance =
      parseFloat(query.maxDistance);
  }
  if (query.minDistance !== undefined) {
    filters['address.loc'].$nearSphere.$minDistance =
      parseFloat(query.minDistance);
  }
}

function getFilters(query) {
  var filters = {};
  addLocalizationFilter(filters, query);
  if (query.city !== undefined) { filters['address.city'] = query.city; }
  return filters;
}

function getFields(query) {
  if ('string' !== typeof query.fields) { return undefined; }
  var fields = '';
  query.fields.split(',').forEach(function(field) {
    field = field.trim().replace(/^[+-]+/g, '');
    if (field.length > 0) {
      fields = util.format('%s %s', fields, field);
    }
  });
  return fields;
}

router.get('/', function(req, res, next) {
  var filters = getFilters(req.query);
  var fields = getFields(req.query);
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

router.post('/', Auth.userConnected, function(req, res, next) {
  var pub = new PubModel(req.body);
  pub.userId = req.redisData.userId;
  pub.createdAt = Date.now();
  pub.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

router.get('/:pubId', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    res.send(pub);
  });
});

router.put('/:pubId', Auth.userConnected, function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    pub.merge(req.body, { fields: 'name days currency' });
    pub.updatedAt = Date.now();
    pub.save(function(err) {
      if (err) { return next(err); }
      res.end();
    });
  });
});

module.exports = router;
