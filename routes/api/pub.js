'use strict';

var util = require('util');
var express = require('express');
var router = express.Router();
var NotFoundError = require('../../errors/notFoundError');
var Auth = require('../../tools/auth');
var ObjectId = require('mongoose').Types.ObjectId;
var PubModel = require('../../models/pub');
var RadarSearchModel = require('../../models/radarSearch');

router.path = '/pubs';

function addNearFilter(filters, query) {
	filters['address.loc'] = {
		$nearSphere: {
			$geometry: {
				type : 'Point', coordinates : [
					parseFloat(query.longitude), parseFloat(query.latitude)
				]
			}
		}
	};
	if (query.maxDistance !== undefined) {
		filters['address.loc'].$nearSphere.$maxDistance =
			parseFloat(query.maxDistance);
	}
	if (query.minDistance !== undefined) {
		filters['address.loc'].$nearSphere.$minDistance =
			parseFloat(query.minDistance);
	}
}

function addBoxFilter(filters, query) {
	filters['address.loc'] = {
		$geoWithin: {
			$box: [ [ query.SWLng, query.SWlat ], [ query.NELng, query.NElat ] ]
		}
	};
}

function addPolygonFilter(filters, query) {
	var polygon = [];
	query.polygon.forEach(function(data) {
		polygon.push(JSON.parse(data));
	});
	filters['address.loc'] = { $geoWithin: { $polygon: polygon } };
}

function addLocalizationFilter(filters, query) {
	if (query.longitude !== undefined && query.latitude !== undefined) {
		return addNearFilter(filters, query);
	}
	if (query.polygon !== undefined) {
		return addPolygonFilter(filters, query);
	}
	if (query.SWLng !== undefined && query.SWlat !== undefined &&
		query.NELng !== undefined && query.NElat !== undefined) {
		return addBoxFilter(filters, query);
	}
}

function getFilters(query) {
	var filters = {};
	addLocalizationFilter(filters, query);
	if (query.city !== undefined) { filters['address.city'] = query.city; }
	return filters;
}

function getFields(query) {
	if ('string' !== typeof query.fields) { return undefined; }
	var fields = '';
	query.fields.split(',').forEach(function(field) {
		field = field.trim().replace(/^[+-]+/g, '');
		if (field.length > 0) {
			fields = util.format('%s %s', fields, field);
		}
	});
	return fields;
}

function getFieldsVersion(query) {
	var fields = null;
	if (query._v && query._v >= '1.1.0') {
		fields = getFields(query);
	} else {
		fields = 'name address price priceHH currency createdAt updatedAt';
		fields += query._v ? ' openPeriods' : ' days';
	}
	return fields;
}

function addRadarSearchPub(query) {
	if (require('../../config/application.json').google.radarSearch === true) {
		if (query.SWLng !== undefined && query.SWlat !== undefined) {
			RadarSearchModel.pushGoogle({lng: query.SWLng, lat: query.SWlat});
			RadarSearchModel.pushGoogle({lng: query.NELng, lat: query.NElat});
			RadarSearchModel.pushGoogle({
				lng: query.NELng,
				lat: query.SWlat - query.NElat
			});
			RadarSearchModel.pushGoogle({
				lng: query.SWLng - query.NELng,
				lat: query.SWlat - query.NElat
			});
		}
	}
}

router.get('/', function(req, res, next) {
	addRadarSearchPub(req.query);
	var filters = getFilters(req.query);
	var fields = getFieldsVersion(req.query);
	PubModel.find(filters, fields, function(err, pubs) {
		if (err) { return next(err); }
		res.send(pubs);
	});
});

router.post('/', Auth.userConnected, function(req, res, next) {
	req.body.ratings = []; req.body.comments = []; req.body.checkIn = [];
	req.body.nbComments = 0; req.body.rating = null;
	var pub = new PubModel(req.body);
	pub.userId = req.redisData.id;
	pub.save(function(err) {
		if (err) { return next(err); }
		res.end();
	});
});

router.get('/:pubId', function(req, res, next) {
	var id = req.params.pubId;
	if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
	var fields = getFields(req.query);
	PubModel.findById(id, fields, function(err, pub) {
		if (err) { return next(err); }
		if (!pub) { return next(new NotFoundError()); }
		res.send(pub);
	});
});

router.put('/:pubId', Auth.userConnected, function(req, res, next) {
	var id = req.params.pubId;
	if (!ObjectId.isValid(id)) { return next(new NotFoundError()); }
	PubModel.findById(id, function(err, pub) {
		if (err) { return next(err); }
		if (!pub) { return next(new NotFoundError()); }
		pub.merge(req.body, { fields: PubModel.ALLOWED_UPDATE_FIELD });
		pub.save(function(err) {
			if (err) { return next(err); }
			res.end();
		});
	});
});

module.exports = router;
