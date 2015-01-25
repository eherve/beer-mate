'use strict';

var express = require('express');
var router = express.Router();
var UnauthorizedError = require('../errors/unauthorizedError');
var uuid = require('node-uuid');

function isAdministrator(req) {
  return req.user && req.user.administrator === true;
}

router.get('/logging', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var id = uuid.v4();
  require('../socket.io').connection(id, function(socket) {
    require('../logger').stream(function(transport, level, msg, meta) {
      socket.emit('data', { time: Date.now(), logger: transport.label,
        level: level, msg: msg, meta: meta });
    });
  });
  res.render('admin/logging', { id: id });
});


module.exports = router;
