'use strict';

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
      js: {
        files: [
          '*.js',
          'config/*.{json}',
          'routes/{,*/}*.js',
          'bin/www'
        ],
        tasks: [ 'newer:jshint:all' ],
        options: { }
      },
      express: {
        files: [
          '*.js',
          'config/{,*/}*.json',
          'routes/{,*/}*.js',
          'bin/www'
        ],
        tasks: ['express:dev', 'wait'],
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
        src: [
          '*.js',
          'routes/{,*/}*.js',
          'bin/www'
        ]
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
        debug: false
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

  // Tasks
  grunt.registerTask('default', [
    'jshint'
  ]);

  grunt.registerTask('debug', [
    'newer:jshint',
    'express:dev',
    'watch'
  ]);

  grunt.registerTask('serve', [ 'express:prod' ]);

  grunt.registerTask('wait', function () {
    // Used for delaying livereload until after server has restarted
    grunt.log.ok('Waiting for server reload...');
    var done = this.async();
    setTimeout(function () {
      grunt.log.writeln('Done waiting!');
      done();
    }, 1500);
  });
};
