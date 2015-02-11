'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var UserModel = require('../../models/user');

router.get('/', Auth.adminConnected, function(req, res) {
  res.render('admin/users');
});

router.get('/datatable', Auth.adminConnected, function(req, res, next) {
  UserModel.dataTable(req.query, function(err, data) {
    if(err) { return next(err); }
    res.send(data);
  });
});

router.delete('/remove', Auth.adminConnected, function(req, res, next) {
  var ids = req.body.ids;
  UserModel.remove({ _id: { $in: ids } }, function(err, data) {
    if (err) { return next(err); }
    if (data === 0) { return next(new NotFoundError()); }
    res.end();
  });
});

module.exports = router;
