'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var winston = require('winston');
var mkdirp = require('mkdirp');
var FileTool = require('./tools/file');

var settings;
var loggers = {};

function addConsoleOutput(logger, settings) {
  var options = JSON.parse(JSON.stringify(settings));
  options.label = logger.label;
  logger.add(winston.transports.Console, options);
}

function addFileOutput(logger, settings) {
  var options = JSON.parse(JSON.stringify(settings));
  options.label = logger.label;
  var filename = options.filename || 'app.log';
  if (filename.indexOf('/') !== 0) {
    filename = path.join(__dirname, '..', filename);
    }
  var nameIndex = filename.lastIndexOf('/');
  if (!fs.existsSync(filename.substring(0, nameIndex))) {
    mkdirp.sync(filename.substring(0, nameIndex));
  }
  options.filename = filename;
  logger.add(winston.transports.File, options);
  if (options.rotation === true) {
    FileTool.dailyRotate(filename);
  }
}

module.exports.get = function(name) {
  if (!name) { name = 'default'; }
  if (loggers[name]) { return loggers[name]; }
  var logger = loggers[name] = new (winston.Logger)({ exitOnError: false });
  logger.label = name;
  if (!settings || !settings.outputs) { return logger; }
  if (settings.outputs.console) {
    addConsoleOutput(logger, settings.outputs.console);
  }
  if (settings.outputs.file) {
    addFileOutput(logger, settings.outputs.file);
  }
  return logger;
};

module.exports.configure = function(options) {
  settings = options;
};

module.exports.expressLogger = function(req, res, next) {
  var start = Date.now();
  var _end = res.end;
  res.end = function(chunk, encoding) {
    var duration = Date.now() - start;
    var status = res.statusCode;
    var level = 'info';
    res.end = _end;
    res.end(chunk, encoding);
    module.exports.get('Express').log(level,
      util.format('%s %s %s - %s ms', req.method, req.originalUrl,
        status, duration));
  };
  next();
};

