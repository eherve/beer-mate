'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var mongoose = require('mongoose');
var DataTable = require('mongoose-datatable');
var Merge = require('mongoose-merge-plugin');
var logger = require('logger-factory').get('Database');

mongoose.set('debug', function(collectionName, method, query) {
  logger.debug(util.format('run mongo collection: %s, method: %s, query: %s',
    collectionName, method, JSON.stringify(query)));
});

DataTable.configure({
  debug: true,
  logger: function(level, args) {
    require('logger-factory').get('DataTable')[level].apply(this, args);
  }
});
mongoose.plugin(DataTable.init);
mongoose.plugin(Merge);

function upgradeSort(a, b) {
  a = a.replace(/^.*_([0-9]+)(\.js$|$)/, '$1');
  b = b.replace(/^.*_([0-9]+)(\.js$|$)/, '$1');
  return a > b ? 1 : -1;
}

function upgradeFilter(upgrades) {
  for (var i = 0; i < upgrades.length; ++i) {
    var upgrade = upgrades[i];
    if (!/^.*_([0-9]+)(\.js$|$)/.test(upgrade)) {
      upgrades.splice(i--, 1);
    }
  }
  return upgrades;
}

function upgrade(cb) {
  logger.debug('upgrade database');
  var ParameterModel = require('./models/parameter');
  ParameterModel.findOne({ name: 'upgrade' }, function(err, param) {
    if (err) { return cb(err); }
    if (!param) { param = new ParameterModel({ name: 'upgrade' }); }
    logger.info('Database upgrade timestamp:', param.value);
    fs.readdir(path.join(__dirname, 'upgrades'), function(err, upgrades) {
      if (err) { return cb(err); }
      upgradeFilter(upgrades).sort(upgradeSort);
      (function run(index) {
        if (index >= upgrades.length) { return param.save(cb); }
        var upgrade = upgrades[index];
        var timestamp = upgrade.replace(/^.*_([0-9]+)(\.js$|$)/, '$1');
        if (param.value && timestamp <= param.value) { return run(++index); }
        logger.debug('Run upgrade:', upgrade);
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

function loadModels(cb) {
  fs.readdir(path.join(__dirname, 'models'), function(err, models) {
    if (err) { return cb(err); }
    for (var index = 0; index < models.length; ++index) {
      var modelName = models[index];
      if (!/^.*.js$/.test(modelName)) { continue; }
      logger.debug(util.format('Load model %s', modelName));
      require(path.join(__dirname, 'models', modelName));
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
    logger.info('Database connected');
    this.removeListener('error', cb);
    db.on('error', function(err) {
      console.error(util.format('%s:%s/%s %s',
        this.host, this.port, this.name, err));
    });
		module.exports.db = db;
    loadModels(cb);
  });
};
