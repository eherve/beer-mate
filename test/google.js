'use strict';
/* globals describe,it,beforeEach */

var util = require('util');
var assert = require('assert');
var request = require('supertest');

var tools = require('./tools');

describe('Google', function() {
	beforeEach('authentification', tools.auth);
	describe('Radar search', function() {
		describe('GET /api/google/radar-search', function() {
			this.timeout(10000);
			it('should return list of google pubs', function(done) {
				request(tools.HOSTNAME)
					.get('/api/google/radar-search')
					.query(tools.token)
					.query({ lat: 48.8567, lng: 2.3508 })
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function(err, res) {
						assert.ifError(err);
						assert(util.isArray(res.body.results));
						done();
					});
			});
		});
	});
	describe('Radar search', function() {
		describe('GET /api/google/run-insert-pubs', function() {
			this.timeout(10000);
			it('should start the fetch of google pub', function(done) {
				request(tools.HOSTNAME)
					.get('/api/google/run-insert-pubs')
					.query(tools.token)
					.query({ lat: 48.8567, lng: 2.3508 })
					.expect(200)
					.end(function(err) {
						assert.ifError(err);
						done();
					});
			});
		});
	});
});