'use strict';

var express = require('express');
var router = express.Router();
var Auth = require('../../tools/auth');
var AccessModel = require('../../models/access');

router.get('', Auth.adminConnected, function(req, res, next) {
  AccessModel.find(function(err, access) {
    if (err) { return next(err); }
    res.send(access);
  });
});

module.exports = router;
