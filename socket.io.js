'use strict';

var socketIo = require('socket.io');
var registered = [];

var io = module.exports.io;

module.exports.connect = function(server) {
  io = socketIo(server);
  registered.forEach(function(reg) {
    io.of(reg.path).on('connection', reg.cb);
  });
  registered = [];
};

module.exports.connection = function(path, cb) {
  if (!io) {
    registered.push({ path: path, cb: cb });
  } else {
    io.of(path).on('connection', cb);
  }
};

module.exports.removeConnection = function(path, cb) {
  io.of(path).removeListener('connection', cb);
};
