'use strict';

var util = require('util');
var logger = require('logger-factory').get('Redis');
var redis = require('redis');
var redisCli = null;
var prefix = '';

module.exports.connect = function(config, cb) {
  var host = config.host;
  var port = config.port;
  var opts = config.options;
  if (config.prefix && config.prefix.trim() !== '') {
		prefix = config.prefix + '-';
	}
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

var register = module.exports.register = function(token, userId, cb) {
  logger.debug('register userId %s for token %s', userId, token);
  if (redisCli !== null && redisCli.connected) {
    if (token.trim() !== '' ) { // TODO remove, it will never happend
      redisCli.set(prefix+token, JSON.stringify({
        id: userId, lastAccess: Date.now() }), cb);
    } else {
      cb(new Error('didn\'t receive a token'));
    }
  } else {
    cb(new Error('Redis server not connected'));
  }
};

module.exports.unregister = function(token, cb) {
  logger.debug('unregister token %s', token);
  if (redisCli !== null && redisCli.connected) {
    redisCli.del(prefix+token, cb);
  } else {
    cb(new Error('Redis server not connected'));
  }
};

module.exports.get = function(token, cb) {
  if (redisCli !== null && redisCli.connected) {
    redisCli.get(prefix+token, function(err, data) {
      if (err) { return cb(err); }
      if (data === null) { return cb(null, null); }
      try {
        data = JSON.parse(data);
      } catch(err) { return cb(err); }
      register(token, data.id, function(err) {
        if (err) { return cb(err); }
        cb(null, data);
      });
    });
  } else {
    cb(new Error('Redis server not connected'));
  }
};
