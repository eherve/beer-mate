'use strict';

var express = require('express');
var router = express.Router();
var passport = require('passport');

router.post('/login', passport.authenticate('local'), function(req, res) {
  res.end();
});

router.get('/logout', function(req, res) {
  req.logout();
  res.end();
});

module.exports = router;
