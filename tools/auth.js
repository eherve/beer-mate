'use strict';

//var logger = require('../logger').get('redisAuth');
var redis = require('../redis');
var UnauthorizedError = require('../errors/unauthorizedError');
var ForbiddenError = require('../errors/forbiddenError');
var logger = require('../logger').get('Auth');
var util = require('util');

var getDbUser = function(userid, req, next) {
		var users = require('../models/user');
		users.findById(userid).exec(function(err, userInfo) {
				if (err) {return next(err); }
				//if (userInfo === null) {return next(new UnauthorizedError());}
				req.user = userInfo;
				next();
		});

}

var userConnected = module.exports.userConnected = function(req, res, next) {
		var token = req.headers.auth_token || req.query.auth_token;

		redis.get(token, function(err, reply) {
				if (err) {return next(err);}
				var data = JSON.parse(reply);
				if (reply !== null) {
						req.redisData = data;
						req.redisData.token = token;
						getDbUser(data.id, req, function(err) {
								if (err) {return next(err); }
								if (req.user === null) {
										logger.warn(util.format('remove token %s for unknown user %s', token, data.id));
										redis.unregister(token);
										next(new UnauthorizedError());
								} else {
										next();
								}
						});
				} else {
						next(new UnauthorizedError());
				}
		});
};

module.exports.adminConnected = function(req, res, next) {
		userConnected(req, res, function(err) {
				if (err) { return next(err);}
				if (req.user.administrator !== true) {
						return next(new ForbiddenError());
				}
				next();
		});
};

