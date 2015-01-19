'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var mongoose = require('mongoose');

module.exports.connect = function(config, cb) {
  var host = config.host;
	var dbname = config.database;
  var port = config.port;
  var connection = mongoose.createConnection(host, dbname, port,	config.options);
  // process.onStop(mongoose.connection.close.bind(connection));
  connection.once('error', cb);
  connection.once('open', function(err) {
    console.log('Database connected');
    this.removeListener('error', cb);
    connection.on('error', function(err) {
      console.error(util.format('%s:%s/%s %s',
        this.host, this.port, this.name, err));
    });
    cb(err, connection);
  });
};

module.exports.loadModels = function(connection, cb) {
  fs.readdir(path.join(__dirname, 'models'), function(err, models) {
    if (err) { return cb(err); }
    (function run(index) {
      if (index >= models.length) {
        console.log('Models loaded');
        return cb();
      }
      var modelName = models[index];
      if (/^.*.js$/.test(modelName)) {
        console.log('Load model', modelName);
        var model = require(path.join(__dirname, 'models', modelName));
        model.register(connection, function(err) {
          if (err) { return cb(err); }
          run(++index);
        });
      } else { run(++index); }
    })(0);
  });
};
