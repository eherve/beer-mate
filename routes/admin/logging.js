'use strict';

var SocketIo = require('../../socket.io');
var LoggerStream = require('logger-factory').stream;

SocketIo.adminConnection('/admin/logging', function(socket) {
  function send(data) {
    socket.emit('data', { time: data.time, logger: data.transport.label,
      level: data.level, msg: data.msg, meta: data.meta });
  }
  LoggerStream.history().forEach(send);
  LoggerStream.on('logging', send);
  socket.on('disconnect', function () {
    LoggerStream.removeListener('logging', send);
  });
});

