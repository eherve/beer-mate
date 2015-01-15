'use strict';

var express = require('express');
var router = express.Router();

// catch 404 and forward to error handler
router.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

router.use(function(err, req, res) {
  console.error(err);
  res.status(err.status || 500);
  res.send(process.env.DEBUG ? err.message : null);
});

module.exports = router;
