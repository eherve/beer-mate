'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var winston = require('winston');
var mkdirp = require('mkdirp');
var events = require('events');
var CBuffer = require('CBuffer');
var FileTool = require('./tools/file');

var settings;
var loggers = {};

/* Log Streaming */
function Stream() {
  events.EventEmitter.call(this);
  this.cbuffer = new CBuffer(25);
}
util.inherits(Stream, events.EventEmitter);
Stream.prototype.history = function() {
  return this.cbuffer;
};
Stream.prototype.source = function(logger) {
  var self = this;
  logger.on('logging', function(transport, level, msg, meta) {
    var data = { transport: transport, level: level, msg: msg, meta: meta };
    self.cbuffer.push(data);
    self.emit('logging', data);
  });
};
var stream = module.exports.stream = new Stream();
/**/

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
  stream.source(logger);
  logger.label = name;
  if (!settings || !settings.outputs) { return logger; }
  if (settings.outputs.console) {
    addConsoleOutput(logger, settings.outputs.console);
  }
  if (settings.outputs.file) {
    addFileOutput(logger, settings.outputs.file);
  }
		// START FIXME: should be fixed in next winston version
    var oldLogger = logger.log;
    logger.log = function() {
      for (var index = 0; index < arguments.length; ++index) {
        if (util.isError(arguments[index])) {
          arguments[index] = arguments[index].message;
        }
      }
      oldLogger.apply(this, arguments);
		};
		//  END  FIXME
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

