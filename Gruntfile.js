'use strict';

var RELOAD_WAITING_TIMEOUT = 1500;
var FILES = {
  jshint: {
    all: [ '*.js', 'routes/{,*/}*.js', 'public/{,*/}*.js', 'bin/www' ],
    server: [ '*.js', 'routes/{,*/}*.js', 'bin/www' ]
  },
  watch: {
    all: [ '*.js', 'config/*.{json}', 'routes/{,*/}*.js', 'public/{,*/}*.js', 'bin/www' ],
    server: [ '*.js', 'config/{,*/}*.json', 'routes/{,*/}*.js', 'bin/www' ]
  }
};

module.exports = function(grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Project configuration
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    config: grunt.file.readJSON('config/application.json'),
    port: '<%= config.port %>' || process.env.PORT || 9000,
    dport: '<%= config.dport %>' || 5858,

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      all: {
        files: FILES.watch.all,
        tasks: [ 'newer:jshint:all' ],
        options: { }
      },
      server: {
        files: FILES.watch.server,
        tasks: [ 'express:dev', 'wait', 'newer:jshint:server' ],
        options: {
          livereload: true,
          nospawn: true // Without this option specified express won't be reloaded
        }
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {

        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: FILES.jshint.all
      },
      server: {
        src: FILES.jshint.server
      }
    },

    // Open
    open: {
      server: {
        url: 'http://localhost:<%=port%>'
      }
    },

    // Server Express
    express: {
      options: {
        script: 'bin/www', port: '<%=port%>',
        output: '.+', debug: false
      },

      dev: {
        options: {
          debug: true
        }
      },
      prod: {
        options: {}
      }
    }

  });

  // Utils tasks
  grunt.registerTask('wait',
    'Delaying livereload until after server has restarted',
    function () {
      // Used for delaying livereload until after server has restarted
      grunt.log.ok('Waiting for server reload...');
      var done = this.async();
      setTimeout(function () {
        grunt.log.writeln('Done waiting!');
        done();
      }, RELOAD_WAITING_TIMEOUT);
    }
  );


  grunt.registerTask('express-keepalive',
    'Keep grunt running',
    function () {
      this.async();
    }
  );

  // Tasks
  grunt.registerTask('default', [
    'jshint:all'
  ]);

  grunt.registerTask('debug', [
    'express:dev',
    'watch:server'
  ]);

  grunt.registerTask('serve', [
    'express:prod',
    'express-keepalive'
  ]);

};
