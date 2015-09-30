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
	shipit.remote('cd ' + shipit.config.deployTo + ' && mkdir -p common/logs/ common/node_modules common/config');
	shipit.remote('cd ' + shipit.releasePath + ' && rm -rf node_modules  && ln -s ' + shipit.config.deployTo + '/common/node_modules');
	shipit.remote('cd ' + shipit.releasePath + '/config && ln -s ' + shipit.config.deployTo + '/common/config/*.json -t .');
    });

    shipit.on('published', function() {
	shipit.remote('sudo /usr/bin/supervisorctl restart beermate-'+shipit.environment);
    });
    
    
};
