'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var logger = require('../logger').get('redisAuth');
var redis = require('redis');
//redis.debug_mode = true;
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
						console.error(util.format('%s:%s/%s %s', this.host, this.port, this.name, err));
				});
				cb();
		});
}

var userConnected = module.exports.userConnected = function(req, res, next) {
		if (redisCli != null && redisCli.connected) {
				redisCli.get(req.headers.auth_token, function(err, reply) {
						if (err) {return next(err)}
						next(null, JSON.parse(reply));
				});
		} else {
				next(new Error('Redis not connected'));
		}
}

module.exports.adminConnected = function(req, res, next) {
		userConnected(req, res, function(err, reply) {
				if (err) { return next(err)}
				next(null, reply.admin ? reply : null);
		});
}

module.exports.register = function(token, userid, admin, next) {
		if (redisCli != null && redisCli.connected) {
				if (token.trim() != '' ) {
						redisCli.set(token, JSON.stringify({id: userid, admin: admin, lastAccess: new Date()}), next);
				} else {
						next(new Error('didn\'t receive a token'));
				}
		} else {
				next(new Error('Redis not connected'));
		}
}

module.exports.unregister = function(token, next) {
		if (redisCli != null && redisCli.connected) {
				redisCli.del(token, next);
		} else {
				next(new Error('Redis not connected'));
		}
}
