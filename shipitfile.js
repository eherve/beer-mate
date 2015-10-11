'use strict';

var util = require('util');

module.exports = function (shipit) {
	require('shipit-deploy')(shipit);
	require('shipit-npm')(shipit);

	shipit.initConfig({
		default: {
			servers: 'beermate@beermate.io',
			repositoryUrl: 'git@github.com:eherve/beer-mate.git'
		},
		staging: {
			workspace: '/tmp/repos-staging',
			deployTo: '~/staging'
		},
		prod: {
			workspace: '/tmp/repos-prod',
			deployTo: '~/prod'
		}
	});

	shipit.on('updated', function() {

		shipit.remote(util.format(
			'cd %s && mkdir -p common/logs/ common/node_modules common/config',
			shipit.config.deployTo));
		shipit.remote(util.format(
			'cd %s && && rm -rf node_modules  && ln -s %s/common/node_modules',
			shipit.config.releasePath, shipit.config.deployTo));
		shipit.remote(util.format(
			'cd %s/config && ln -s %s/common/config/*.json -t .',
			shipit.config.releasePath, shipit.config.deployTo));
	});

	shipit.on('published', function() {
		shipit.remote(util.format(
			'sudo /usr/bin/supervisorctl restart beermate-%s',
			shipit.environment));
	});


};
