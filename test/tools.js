'use strict';

var request = require('supertest');
var assert = require('assert');

var token = 'auth_token';

module.exports.HOSTNAME = 'http://localhost:4242';

module.exports.account = { email: 'eherve@beermate.io', password: 'eherve42' };

module.exports.token = null;
module.exports.userId = null;

module.exports.auth = function(done) {
	if (module.exports.token !== null) { return done(); }
	request(module.exports.HOSTNAME)
		.post('/api/auth/login')
		.send(module.exports.account)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function(err, res) {
			assert.ifError(err);
			assert.notEqual(res.body[token], undefined, 'auth token undefined');
			module.exports.token = { 'auth_token': res.body[token] };
			assert.notEqual(res.body.userId, undefined, 'user id undefined');
			module.exports.userId = res.body.userId;
			done();
		});
};