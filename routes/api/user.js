'use strict';

var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var ForbiddenError = require('../../errors/forbiddenError');
var BadRequestError = require('../../errors/badRequestError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var UserModel = require('../../models/user');
var uuid = require('node-uuid');
var Resource = require('../../resource');
var Email = require('../../email');
var emailLogger = require('../../logger').get('Email');
var front = require('../../config/application.json').front;

router.get('/', Auth.adminConnected, function(req, res, next) {
	UserModel.find(function(err, users) {
		if (err) { return next(err); }
		res.send(users);
	});
});

router.post('/', Auth.adminConnected, function(req, res, next) {
	var user = new UserModel();
	user.merge(req.body, { fields: UserModel.ALLOWED_CREATE_FIELD });
	user.save(function(err) {
		if (err) { return next(err); }
		res.end();
	});
});

router.get('/:userId', Auth.userConnected, function(req, res, next) {
	var id = req.params.userId;
	if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
	if (!Auth.isAdmin(req) && req.redisData.id !== id) {
		return next(new ForbiddenError());
	}
	UserModel.findById(id, function(err, user) {
		if (err) { return next(err); }
		if (user) { return res.send(user); }
		next(new NotFoundError());
	});
});

router.put('/:userId', Auth.userConnected, function(req, res, next) {
	var id = req.params.userId;
	if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
	if (!Auth.isAdmin(req) && req.redisData.id !== id) {
		return next(new ForbiddenError());
	}
	UserModel.findById(id, function(err, user) {
		if (err) { return next(err); }
		if (!user) { return next(new NotFoundError()); }
		user.merge(req.body, { fields: UserModel.ALLOWED_UPDATE_FIELD });
		user.save(function(err) {
			if (err) { return next(err); }
			res.end();
		});
	});
});

/* Reset password */
function sendResetPassEmail(req, user, token) {
	Resource.getEmailFile('resetPasswordEmail', user.locale || req.locale,
		function(err, file) {
			if (err) { return; }
			Email.send(user.email, req.translate('email.reset-password'), file,
				{ host: front.url, user: user, token: token }, function(err) {
					if (err) {
						return emailLogger.error('Send reset password email failed', err);
					}
					emailLogger.debug('Reset password email sent');
				});
		});
}

// Reset password by UID (user connected)
router.get('/:userId/password-reset', Auth.userConnected,
	function(req, res, next) {
		var id = req.params.userId;
		if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
		UserModel.findById(id, function(err, user) {
			if (err) { return next(err); }
			if (!user) { return next(new NotFoundError()); }
			var dateLim = new Date();
			dateLim.setDate(dateLim.getDate() + 1);
			if (user.passwordreset && user.passwordreset.date &&
				user.passwordreset.date < dateLim) {
				return next(new ForbiddenError());
			}
			user.save(function(err) {
				if (err) { return next(err); }
				sendResetPassEmail(req, user, user.passwordreset.token);
				res.end();
			});

		});
	});

// Reset password by email
router.post('/password-reset', function(req, res, next) {
	var email = req.body.email;
	if (!email || email.trim() === '') { return next(new BadRequestError()); }
	var field = '+password +salt';
	UserModel.findOne({ email: email }, field, function(err, user) {
		if (err) { return next(err); }
		if (!user) { return next(new NotFoundError()); }
		var dateLim = new Date();
		dateLim.setDate(dateLim.getDate() + 1);
		if (user.passwordreset.date && user.passwordreset.date < dateLim) {
			return next(new ForbiddenError());
		}
		user.passwordreset = {
			token: uuid.v4(),
			date: new Date()
		};
		user.save(function(err) {
			if (err) { return next(err); }
			sendResetPassEmail(req, user, user.passwordreset.token);
			res.end();
		});
	});
});

// reset password, check user email and token
router.post('/reset-password', function(req, res, next) {
	var token = req.body.token;
	var email = req.body.email;
	var password = req.body.password;
	if (!password || password.trim() === '') { return new BadRequestError(); }
	UserModel.findOne({email: email, 'passwordreset.token': token},
		function(err, user) {
			if (err) { return next(err); }
			if (!user) { return next(new NotFoundError()); }
			user.password = password;
			user.passwordreset = null;
			user.save(function(err) {
				if (err) { return next(err); }
				res.end();
			});
		});
});

module.exports = router;
