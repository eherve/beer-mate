'use strict';

var express = require('express');
var router = express.Router();
var UnauthorizedError = require('../errors/unauthorizedError');
var uuid = require('node-uuid');
var SocketIo = require('../socket.io');
var LoggerStream = require('../logger').stream;

function isAdministrator(req) {
  return req.user && req.user.administrator === true;
}

router.get('/logging', function(req, res, next) {
  if (!isAdministrator(req)) { return next(new UnauthorizedError()); }
  var id = uuid.v4();
  function connection(socket) {
    SocketIo.removeConnection(id, connection);
    function send(data) {
      socket.emit('data', { time: Date.now(), logger: data.transport.label,
        level: data.level, msg: data.msg, meta: data.meta });
    }
    LoggerStream.history().forEach(send);
    LoggerStream.on('logging', send);
    socket.on('disconnect', function () {
      LoggerStream.removeListener('logging', send);
    });
  }
  SocketIo.connection(id, connection);
  res.render('admin/logging', { id: id });
});


module.exports = router;
