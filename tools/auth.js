'use strict';

//var logger = require('../logger').get('redisAuth');
var redis = require('../redis');

var userConnected = module.exports.userConnected = function(req, res, next) {
		redis.get(req.headers.auth_token, function(err, reply) {
				if (err) {return next(err);}
				next(null, JSON.parse(reply));
		});
};

module.exports.adminConnected = function(req, res, next) {
		userConnected(req, res, function(err, reply) {
				if (err) { return next(err);}
				next(null, reply && reply.admin ? reply : null);
		});
};

