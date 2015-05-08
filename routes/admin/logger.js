'use strict';

var express = require('express');
var router = express.Router();
var logger = require('../../logger');

router.get('/', function(req, res, next) {
  next(logger.getLevels());
});

router.post('/', function(req, res) {
  logger.setLevels(req.body.logger, req.body.transport, req.body.level);
  res.end();
});

module.exports = router;
