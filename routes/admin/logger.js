'use strict';

var express = require('express');
var router = express.Router();
var Auth = require('../../tools/auth');
var logger = require('../../logger');

router.get('/', Auth.adminConnected, function(req, res) {
  res.locals.levels = logger.getLevels();
  res.render('admin/logger');
});

router.post('/', Auth.adminConnected, function(req, res) {
  logger.setLevels(req.body.logger, req.body.transport, req.body.level);
  res.end();
});

module.exports = router;
