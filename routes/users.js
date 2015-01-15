'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');
var router = express.Router();

var USER_FILE = path.join(__dirname, '../data/users.json');
var users = require(USER_FILE);

router.all('/*', function(req, res, next) {
  if (req.user != null) { return next(); }
  res.send(401);
});

router.get('/', function(req, res) {
  res.send(users);
});

router.post('/', function(req, res, next) {
  users.push(req.body);
  fs.writeFile(USER_FILE, JSON.stringify(users, null, 4), function(err) {
    if(err) { next(err); }
    else { res.end(); }
  });
});

router.get('/:userId', function(req, res, next) {
  for (var index = 0; index < users.length; ++index) {
    var user = users[index];
    if (user.id === parseInt(req.params.userId)) { return res.send(user); }
  }
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

module.exports = router;
module.exports.USERS = users;
