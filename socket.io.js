'use strict';

var util = require('util');
var logger = require('./logger').get('SoketIo');
var socketIo = require('socket.io');
var Auth = require('./tools/auth');
var registered = [];

var io = module.exports.io;

module.exports.connect = function(server) {
  io = socketIo(server, {});
  registered.forEach(function(reg) {
    logger.debug(util.format('Registering path: %s', reg.path));
    var path = io.of(reg.path);
    if (reg.middleware) { path.use(reg.middleware); }
    path.on('connection', reg.cb);
  });
  registered = [];
};

module.exports.connection = function(path, middleware, cb) {
  if (cb === undefined) { cb = middleware; middleware = undefined; }
  if (!io) {
    logger.debug(util.format('No io, delayed registration of path: %s', path));
    registered.push({ path: path, middleware: middleware, cb: cb });
  } else {
    logger.debug(util.format('Registering path: %s', path));
    path = io.of(path);
    if (middleware) { path.use(middleware); }
    path.on('connection', cb);
  }
};

module.exports.removeConnection = function(path, cb) {
  io.of(path).removeListener('connection', cb);
};

module.exports.userConnection = function(path, cb) {
  function middleware(socket, next) {
    var req = socket.request;
    req.query = req._query;
    var res = socket.res;
    Auth.userConnected(req, res, next);
  }
  module.exports.connection(path, middleware, cb);
};

module.exports.adminConnection = function(path, cb) {
  function middleware(socket, next) {
    logger.debug(util.format('connection path: %s', path));
    var req = socket.request;
    req.query = req._query;
    var res = socket.res;
    Auth.adminConnected(req, res, next);
  }
  module.exports.connection(path, middleware, cb);
};
