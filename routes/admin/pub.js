'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var PubModel = require('../../models/pub');

router.get('/', Auth.adminConnected, function(req, res) {
  res.render('admin/pubs');
});

router.get('/datatable', Auth.adminConnected, function(req, res, next) {
  PubModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

router.delete('/remove', Auth.adminConnected, function(req, res, next) {
  var ids = req.body.ids;
  PubModel.remove({ _id: { $in: ids } }, function(err, data) {
    if (err) { return next(err); }
    if (data === 0) { return next(new NotFoundError()); }
    res.end();
  });
});

module.exports = router;
