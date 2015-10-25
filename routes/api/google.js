'use strict';

var express = require('express');
var ObjectId = require('mongoose').Types.ObjectId;
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var google = require('../../google');
var Auth = require('../../tools/auth');
var PubModel = require('../../models/pub');

router.path = '/google';

router.get('/unprocessed', Auth.adminConnected, function(req, res, next) {
	var filters = { 'google.search': { $exists: false } };
	var fields = 'name address google';
	var query = PubModel.find(filters, fields);
	if (req.query.limit) { query.limit(req.query.limit); }
	if (req.query.skip) { query.skip(req.query.skip); }
	query.exec(function(err, pubs) {
		if (err) { return next(err); }
		res.send(pubs);
	});
});

router.get('/mismatch', Auth.adminConnected, function(req, res, next) {
	var filters = { 'google.search': true, 'google.placeId': null };
	var fields = 'name address google';
	PubModel.find(filters, fields, function(err, pubs) {
		if (err) { return next(err); }
		res.send(pubs);
	});
});

router.get('/process', Auth.adminConnected, function(req, res, next) {
	var filters = { $or: [
		{ 'google.placeId': { $exists: false } },
		{ 'google.placeId': null } ] };
	var fields = 'name address google';
	var query = PubModel.find(filters, fields);
	if (req.query.limit) { query.limit(req.query.limit); }
	query.exec(function(err, pubs) {
		if (err) { return next(err); }
		(function run(index) {
			if (index >= pubs.length) { return res.send(pubs); }
			var pub = pubs[index];
			google.searchGooglePub(pub,
				{ radius: req.query.radius, types: req.query.types },
				function(err, data) {
					if (err) { return next(err); }
					google.setProcessed(pub,
						data && data.results && data.results.length === 0 ?
							data.results[0] : null, function(err) {
							if (err) { return next(err); }
							run(++index);
						});
				}
			);
		})(0);
	});
});

router.get('/arround/:pubId', Auth.adminConnected, function(req, res, next) {
	var id = req.params.pubId;
	if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
	var fields = 'name address google';
	PubModel.findById(id, fields, function(err, pub) {
		if (err) { return next(err); }
		if (!pub) { return next(new NotFoundError()); }
		google.searchGooglePub(pub,
			{ radius: req.query.radius, types: req.query.types, useName: false },
			function(err, data) {
				if (err) { return next(err); }
				res.send({ pub: pub, match: data });
			}
		);
	});
});

module.exports = router;