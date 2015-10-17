'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var logger = require('logger-factory').get('Web Content Route');
var NotFoundError = require('../../errors/notFoundError');
var BadRequestError = require('../../errors/badRequestError');
var WebContentModel = require('../../models/webContent');
var Auth = require('../../tools/auth');

router.path = '/web-content';

/*
 * List all web contents
 */
router.get('/', Auth.adminConnected, function(req, res, next) {
	WebContentModel.find(function(err, data) {
		if (err) { return next(err); }
		res.send(data);
	});
});

/*
 * Get one web content
 */
router.get('/:id', function(req, res, next) {
	if (logger.isDebug()) {
		logger.debug(util.format(
			'fetch web content %s version %s locale %s',
			req.params.id,
			req.query.version ? req.query.version : 'all',
			req.query.locale ? req.query.locale : 'all'
		));
	}
	var aggregate = WebContentModel.aggregate();
	aggregate.match({ _id: req.params.id });
	if (req.query.version) {
		aggregate.unwind('versions');
		if (req.query.version === 'last') {
			aggregate.sort({ 'versions._id': -1 });
			aggregate.limit(1);
		} else { aggregate.match({ 'versions._id': req.query.version }); }
		aggregate.group({ _id: '$_id', versions: { $first: '$versions' } });
	}
	if (req.query.locale) {
		if (!req.query.version) { aggregate.unwind('versions'); }
		if (req.query.locale === 'default') { req.query.locale = 'fr'; }
		aggregate.unwind('versions.locales')
			.match({ 'versions.locales._id': req.query.locale });
	}
	if (req.query.filter) {
		var project = {};
		req.query.filter.split(',').forEach(function(val) {
			project[val] = 1;
		});
		aggregate.project(project);
	}
	aggregate.exec(function(err, data) {
		if (err) { return next(err); }
		if (data) { return res.send(data); }
		next(new NotFoundError());
	});
});

/*
 * Update one web content
 */
router.put('/:id/:version/:locale', Auth.adminConnected,
	function(req, res, next) {
		if (logger.isDebug()) {
			logger.debug(util.format(
				'update web content %s version %s locale %s',
				req.params.id, req.query.version, req.query.locale
			));
		}
		WebContentModel.findById(req.params.id, function(err, webContent) {
			if (err) { return next(err); }
			if (!webContent) { return next(new NotFoundError()); }
			var version = webContent.versions.id(req.params.version);
			if (!version) { return next(new NotFoundError()); }
			var locale = version.locales.id(req.params.locale);
			if (!locale) { return next(new NotFoundError()); }
			locale.data = req.body.content;
			webContent.save(function(err) {
				if (err) { return next(err); }
				res.end();
			});
		});
	}
);

/*
 * Create one web content version
 */
router.post('/:id', Auth.adminConnected, function(req, res, next) {
	if (logger.isDebug()) {
		logger.debug(util.format(
			'create web content %s version %s',
			req.params.id, req.body.version
		));
	}
	WebContentModel.findById(req.params.id, function(err, webContent) {
		if (err) { return next(err); }
		if (!webContent) { return next(new NotFoundError()); }
		var version = webContent.versions.id(req.body.version);
		if (version !== null) { return next(new BadRequestError(
			'error.web_content_version_exists')); }
		webContent.versions.push(version);
		webContent.save(function(err) {
			if (err) { return next(err); }
			res.end();
		});
	});
});

module.exports = router;
