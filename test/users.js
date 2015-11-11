'use strict';
/* globals describe,it, beforeEach */

var assert = require('assert');
var request = require('supertest');

var tools = require('./tools');

describe('Users', function() {
	describe('Not Authentificated', function() {
		describe('GET /api/user', function () {
			it('should return 401', function(done) {
				request(tools.HOSTNAME)
					.get('/api/user')
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(401, done);
			});
		});
	});
	describe('Authentificated', function() {
		beforeEach('authentification', tools.auth);
		describe('GET /api/user', function () {
			it('should return the current user', function(done) {
				request(tools.HOSTNAME)
					.get('/api/user')
					.query(tools.token)
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function(err, res) {
						assert.ifError(err);
						assert.equal(res.body._id, tools.userId, 'user id mismatch');
						done();
					});
			});
		});
	});
});