'use strict';

var util = require('util');
var express = require('express');
var apiRouter = express.Router();
var viewRouter = express.Router();
var NotFoundError = require('../errors/notFoundError');
var Auth = require('../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../models/pub');

/* API */

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

apiRouter.get('/', function(req, res, next) {
  var filters = getFilters(req.query);
  var fields = getFields(req.query);
  PubModel.find(filters, fields, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

apiRouter.post('/', Auth.userConnected, function(req, res, next) {
  var pub = new PubModel(req.body);
  pub.userId = req.redisData.userId;
  pub.createdAt = Date.now();
  pub.save(function(err) {
    if (err) { return next(err); }
    res.end();
  });
});

apiRouter.get('/:pubId', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (!pub) { return next(new NotFoundError()); }
    res.send(pub);
  });
});

apiRouter.put('/:pubId', Auth.userConnected, function(req, res, next) {
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

/* View */

viewRouter.get('/', Auth.adminConnected, function(req, res) {
  res.render('pubs');
});

viewRouter.get('/datatable', Auth.adminConnected, function(req, res, next) {
  PubModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

apiRouter.delete('/remove', Auth.adminConnected, function(req, res, next) {
  var ids = req.body.ids;
  PubModel.remove({ _id: { $in: ids } }, function(err, data) {
    if (err) { return next(err); }
    if (data === 0) { return next(new NotFoundError()); }
    res.end();
  });
});

module.exports = { api: apiRouter, view: viewRouter };
