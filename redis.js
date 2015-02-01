'use strict';

var util = require('util');
var logger = require('./logger').get('Redis');
var redis = require('redis');
var redisCli = null;

module.exports.connect = function(config, cb) {
  var host = config.host;
  var port = config.port;
  var opts = config.options;
  redisCli = redis.createClient(port, host, opts);
  redisCli.once('error', cb);
  redisCli.once('ready', function() {
    logger.debug('redis connected!');
    this.removeListener('error', cb);
    redisCli.on('error', function(err) {
      console.error(util.format('%s:%s/%s %s',
        this.host, this.port, this.name, err));
    });
    cb();
  });
};

var register = module.exports.register = function(token, userid, cb) {
  if (redisCli !== null && redisCli.connected) {
    if (token.trim() !== '' ) { // TODO remove, it will never happend
      redisCli.set(token, JSON.stringify({
        id: userid, lastAccess: Date.now()
      }), cb);
    } else {
      cb(new Error('didn\'t receive a token'));
    }
  } else {
    cb(new Error('Redis server not connected'));
  }
};

module.exports.unregister = function(token, cb) {
  if (redisCli !== null && redisCli.connected) {
    redisCli.del(token, cb);
  } else {
    cb(new Error('Redis server not connected'));
  }
};

module.exports.get = function(token, cb) {
  if (redisCli !== null && redisCli.connected) {
    redisCli.get(token, function(err, data) {
      if (err) {return cb(err);}
      if (data === null) { return cb(null, null); } 
      register(token, data.id, function(err) {
        if (err) {return cb(err);}
        cb(null, data);
      });
    });
  } else {
    cb(new Error('Redis server not connected'));
  }
};
