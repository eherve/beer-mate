'use strict';
/* globals describe,it */

var request = require('supertest');

var tools = require('./tools');

describe('Auth', function() {
	describe('login', function() {
		describe('POST /api/auth/login', function () {
			it('should return 400', function(done) {
				request(tools.HOSTNAME)
					.post('/api/auth/login')
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(400, done);
			});
			it('should return 401 not authorized', function(done) {
				request(tools.HOSTNAME)
					.post('/api/auth/login')
					.send({ email: 'test', password: 'test' })
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(401, done);
			});
			it('should return account auth key', tools.auth);
		});
	});
});