'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var logger = require('../../logger').get('Web Content Route');
var NotFoundError = require('../../errors/notFoundError');
var WebContentModel = require('../../models/webContent');

router.get('/', function(req, res, next) {
	WebContentModel.find(function(err, data) {
		if (err) { return next(err); }
		res.send(data);
	});
});

router.get('/:webContentId', function(req, res, next) {
	logger.debug(util.format(
		'fetch web content %s version %s locale %s',
		req.params.webContentId,
		req.query.version ? req.query.version : 'all',
		req.query.locale ? req.query.locale : 'all'
	));
	var aggregate = WebContentModel.aggregate();
	aggregate.match({ _id: req.params.webContentId });
	if (req.query.version) {
		aggregate.unwind('versions');
		if (req.query.version === 'last') {
			aggregate.sort({ 'versions._id': -1 });
			aggregate.limit(1);
		} else {
			aggregate.match({ 'versions._id': req.query.version });
		}
		aggregate.group({ _id: '$_id', versions: { $first: '$versions' } });
	}
	if (req.query.locale) {
		if (!req.query.version) { aggregate.unwind('versions'); }
		if (req.query.locale === 'default') { req.query.locale = 'fr'; }
		aggregate.unwind('versions.locales')
			.match({ 'versions.locales._id': req.query.locale });
	}
	aggregate.exec(function(err, data) {
		if (err) { return next(err); }
		if (data) { return res.send(data); }
		next(new NotFoundError());
	});
});

module.exports = router;
