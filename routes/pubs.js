'use strict';

var express = require('express');
var apiRouter = express.Router();
var viewRouter = express.Router();
var NotFoundError = require('../errors/notFoundError');
var UnauthorizedError = require('../errors/unauthorizedError');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../models/pub');

/* API */

function addLocalizationFilter(filter, query) {
  if (query.longitude === undefined ||
  query.latitude === undefined) { return; }
  filter['address.loc'] = {
    $nearSphere: {
      $geometry: {
        type : 'Point', coordinates : [
          parseFloat(query.longitude), parseFloat(query.latitude)
        ]
      }
    }
  };
  if (query.maxDistance !== undefined) {
    filter['address.loc'].$nearSphere.$maxDistance =
      parseFloat(query.maxDistance);
  }
  if (query.minDistance !== undefined) {
    filter['address.loc'].$nearSphere.$minDistance =
      parseFloat(query.minDistance);
  }
}

function addFilter(filter, query) {
  addLocalizationFilter(filter, query);
  if (query.city !== undefined) { filter['address.city'] = query.city; }
}

apiRouter.get('/', function(req, res, next) {
  var filter = {};
  addFilter(filter, req.query);
  PubModel.find(filter, function(err, pubs) {
    if (err) { return next(err); }
    res.send(pubs);
  });
});

apiRouter.post('/', function(req, res, next) {
  if (!req.user) { return next(new UnauthorizedError()); }
  var pub = new PubModel(req.body);
  pub.userId = req.user._id;
  pub.createdAt = Date.now();
  pub.save(function(err) {
    console.log(err);
    if (err) { return next(err); }
    res.end();
  });
});

apiRouter.get('/:pubId', function(req, res, next) {
  var id = req.params.pubId;
  if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
  PubModel.findById(id, function(err, pub) {
    if (err) { return next(err); }
    if (pub) { return res.send(pub); }
    next(new NotFoundError());
  });
});

/* View */

viewRouter.get('/', function(req, res, next) {
  if (!req.user || !req.user.administrator) {
    return next(new UnauthorizedError());
  }
  res.render('pubs');
});

viewRouter.get('/datatable', function(req, res, next) {
  if (!req.user || !req.user.administrator) {
    return next(new UnauthorizedError());
  }
  PubModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

module.exports = { api: apiRouter, view: viewRouter };
