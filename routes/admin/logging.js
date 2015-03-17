'use strict';

var express = require('express');
var router = express.Router();
var Auth = require('../../tools/auth');
var uuid = require('node-uuid');
var SocketIo = require('../../socket.io');
var LoggerStream = require('../../logger').stream;

SocketIo.adminConnection('/admin/logging', function(socket) {
  function send(data) {
    socket.emit('data', { time: Date.now(), logger: data.transport.label,
      level: data.level, msg: data.msg, meta: data.meta });
  }
  LoggerStream.history().forEach(send);
  LoggerStream.on('logging', send);
  socket.on('disconnect', function () {
    LoggerStream.removeListener('logging', send);
  });
});

router.get('/', Auth.adminConnected, function(req, res) {
  res.render('admin/logging');
});
module.exports = router;
