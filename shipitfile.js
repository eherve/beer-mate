module.exports = function (shipit) {
    require('shipit-deploy')(shipit);
    
    shipit.initConfig({
	default: {
	    servers: 'beermate@beermate.io',
	    repositoryUrl: 'https://github.com/eherve/beer-mate.git'
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
	shipit.remote('cd ' + shipit.releasePath + ' && npm install && node ./tools-config.js');
    });
    
};
