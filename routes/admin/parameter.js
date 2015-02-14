'use strict';

var express = require('express');
var router = express.Router();
var Auth = require('../../tools/auth');
var ParameterModel = require('../../models/parameter');

router.get('/', Auth.adminConnected, function(req, res) {
  res.render('admin/parameters');
});

router.get('/datatable', Auth.adminConnected, function(req, res, next) {
  ParameterModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

module.exports = router;
