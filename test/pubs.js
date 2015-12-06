'use strict';
/* globals describe,it,beforeEach */

var util = require('util');
var assert = require('assert');
var request = require('supertest');

var tools = require('./tools');

var pub;

describe('Pubs', function() {
	describe('Not Authentificated', function() {
		describe('GET /api/pubs', function () {
			it('should return list of pubs', function(done) {
				request(tools.HOSTNAME)
					.get('/api/pubs')
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function(err, res) {
						assert.ifError(err);
						assert(util.isArray(res.body));
						if (res.body.length > 0) { pub = res.body[0]; }
						done();
					});
			});
		});
		describe('GET /api/pubs/:wrong-id', function () {
			it('should return 404', function(done) {
				request(tools.HOSTNAME)
					.get('/api/pubs/wrong-id')
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(404, done);
			});
		});
		describe('GET /api/pubs/:id', function () {
			it('should return the pub if exists', function(done) {
				request(tools.HOSTNAME)
					.get('/api/pubs/' + (pub ? pub._id : 'undefined'))
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.end(function(err, res) {
						assert.ifError(err);
						if (pub !== undefined) {
							assert.equal(res.status, 200);
							assert.equal(res.body._id, pub._id, 'pub id mismatch');
						} else {
							assert.equal(res.status, 404);
						}
						done();
					});
			});
		});
	});
	describe('Authentificated', function() {
		beforeEach('authentification', tools.auth);
	});
});