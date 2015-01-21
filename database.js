'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var mongoose = require('mongoose');

function upgradeSort(a, b) {
  a = a.replace(/^.*_([0-9]+)\.js$/, '$1');
  b = b.replace(/^.*_([0-9]+)\.js$/, '$1');
  return a > b ? 1 : -1;
}

function upgrade(cb) {
  var ParameterModel = require('./models/parameter');
  ParameterModel.findOne({ name: 'upgrade' }, function(err, param) {
    if (err) { return cb(err); }
    if (!param) { param = new ParameterModel({ name: 'upgrade' }); }
    console.log('Database upgrade timestamp:', param.value);
    fs.readdir(path.join(__dirname, 'upgrades'), function(err, upgrades) {
      if (err) { return cb(err); }
      upgrades.sort(upgradeSort);
      (function run(index) {
        if (index >= upgrades.length) { return param.save(cb); }
        var upgrade = upgrades[index];
        var timestamp = upgrade.replace(/^.*_([0-9]+)\.js$/, '$1');
        if (param.value && timestamp <= param.value) { return run(++index); }
        console.log('Run upgrade:', upgrade);
        param.value = timestamp;
        upgrade = require(path.join(__dirname, 'upgrades', upgrade));
        upgrade.upgrade(function(err) {
          if (err) { return cb(err); }
          run(++index);
        });
      })(0);
    });
  });
}

function loadModels(db, cb) {
  fs.readdir(path.join(__dirname, 'models'), function(err, models) {
    if (err) { return cb(err); }
    for (var index = 0; index < models.length; ++index) {
      var modelName = models[index];
      if (!/^.*.js$/.test(modelName)) { continue; }
      console.log('Load model', modelName);
      var model = require(path.join(__dirname, 'models', modelName));
      model.register(db);
    }
    upgrade(cb);
  });
}

module.exports.connect = function(config, cb) {
  var host = config.host;
	var dbname = config.database;
  var port = config.port;
  var db = mongoose.createConnection(host, dbname, port, config.options);
  db.once('error', cb);
  db.once('open', function() {
    console.log('Database connected');
    this.removeListener('error', cb);
    db.on('error', function(err) {
      console.error(util.format('%s:%s/%s %s',
        this.host, this.port, this.name, err));
    });
    loadModels(db, cb);
  });
};
