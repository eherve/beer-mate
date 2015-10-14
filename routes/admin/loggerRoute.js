'use strict';

var express = require('express');
var router = express.Router();
var logger = require('logger-factory');
var Auth = require('../../tools/auth');

router.path = '/logger';

router.get('/', Auth.adminConnected, function(req, res) {
  res.send(logger.getLevels());
});

router.post('/', Auth.adminConnected, function(req, res) {
  logger.setLevels(req.body.logger, req.body.transport, req.body.level);
  res.end();
});

module.exports = router;
