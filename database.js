'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var mongoose = require('mongoose');

module.exports.connect = function(config, cb) {
  var host = config.host;
	var dbname = config.database;
  var port = config.port;
  var db = mongoose.createConnection(host, dbname, port, config.options);
  // process.onStop(mongoose.db.close.bind(db));
  db.once('error', cb);
  db.once('open', function() {
    console.log('Database connected');
    this.removeListener('error', cb);
    db.on('error', function(err) {
      console.error(util.format('%s:%s/%s %s',
        this.host, this.port, this.name, err));
    });
    cb(null, db);
  });
};

module.exports.loadModels = function(db, cb) {
  fs.readdir(path.join(__dirname, 'models'), function(err, models) {
    if (err) { return cb(err); }
    for (var index = 0; index < models.length; ++index) {
      var modelName = models[index];
      if (!/^.*.js$/.test(modelName)) { continue; }
      console.log('Load model', modelName);
      var model = require(path.join(__dirname, 'models', modelName));
      model.register(db);
    }
    cb();
  });
};
