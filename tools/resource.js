'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var hogan = require('hogan');

var FUNC_TMPL = 'get%s%sPath';
var NO_FILE_TMPL = 'File %s does not exists !';
var ADD_FUNC_TMPL = 'Add function %s !';

var debug = false;
var logger = {
  log: console.log,
  debug: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

var defaultLocale = 'fr';
var folders = {};
var cache = {};

function getPath(rootFolder, filename, locale, options, cb) {
  if ('function' === typeof options) { cb = options; options = {}; }
  if (locale === null) { locale = defaultLocale; }
  var cacheKey = util.format('%s%s%s', rootFolder, locale, filename);
  var c = cache[cacheKey];
  if (c) { return cb(null, c); }
  var file;
  if (options.template === true) {
    file = path.join(rootFolder, hogan.compile(options.template)
      .render({ locale: locale, filename: filename }));
  } else { file = path.join(rootFolder, locale, filename); }
  fs.exists(file, function(exists) {
    if (exists) { cache[cacheKey] = file; return cb(null, file); }
    logger.warn(util.format(NO_FILE_TMPL, file));
    if (locale === defaultLocale) {
      return cb(new Error(util.format(NO_FILE_TMPL, file)));
    }
    getPath(rootFolder, filename, defaultLocale, options, function(err, file) {
      if (err) { return cb(err); }
      cache[cacheKey] = file; cb(null, file);
    });
  });
}

function buildFunc() {
  Object.keys(folders).forEach(function(key) {
    var func = util.format(FUNC_TMPL, key.substring(0, 1).toUpperCase(0, 1),
      key.substring(1));
    logger.debug(util.format(ADD_FUNC_TMPL, func));
    module.exports[func] = function(filename, locale, options, cb) {
      var folder = folders[key]; options = options || {};
      if (folder.template && !options.template) {
        options.template = folder.template;
      }
      getPath(folder.dir, filename, locale, options, cb);
    };
  });
}

module.exports.configure = function(options) {
  options = options || {};
  if (options.debug === true) { debug = true; }
  if ('object' === typeof options.logger) { logger = options.logger; }
  if ('string' === typeof options.defaultLocale) {
    defaultLocale = options.defaultLocale;
  }
  if ('object' === typeof options.folders) { folders = options.folders; }
  buildFunc();
};

