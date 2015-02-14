'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var hogan = require('hogan');
var logger = require('./logger').get('Resource');

var FUNC_FILE_TMPL = 'get%sFile';
var FUNC_FILE_SYNC_TMPL = 'get%sFileSync';
var NO_FILE_MSG_TMPL = 'File %s does not exists !';
var ADD_FUNC_MSG_TMPL = 'Add function %s';
var LOCALE_FILE_TMPL = '{{filename}}_{{locale}}';

var defaultLocale = 'en';
var folders = {};
var cache = {};

function generateCacheKey(folder, filename, locale) {
  return util.format('%s%s%s', folder, filename, locale);
}

function getFilePath(folder, filename, locale, tmpl) {
  return path.join(folder,
    hogan.compile(tmpl).render({ locale: locale, filename: filename }));
}

function getPath(folder, filename, locale, tmpl, cb) {
  var cacheKey = generateCacheKey(folder, filename, locale);
  var c = cache[cacheKey];
  if (c) { return cb(null, c); }
  var file = getFilePath(folder, filename, locale, tmpl);
  fs.exists(file, function(exists) {
    if (exists) { cache[cacheKey] = file; return cb(null, file); }
    if (locale === defaultLocale) {
      var err = util.format(NO_FILE_MSG_TMPL, file);
      logger.error(err); return cb(new Error(err));
    }
    logger.warn(util.format(NO_FILE_MSG_TMPL, file));
    getPath(folder, filename, defaultLocale, tmpl, function(err, file) {
      if (err) { return cb(err); }
      cache[cacheKey] = file; cb(null, file);
    });
  });
}

function getPathSync(folder, filename, locale, tmpl) {
  var cacheKey = generateCacheKey(folder, filename, locale);
  var c = cache[cacheKey];
  if (c) { return c; }
  var file = getFilePath(folder, filename, locale, tmpl);
  if (fs.existsSync(file)) { return (cache[cacheKey] = file); }
  if (locale === defaultLocale) {
    var err = util.format(NO_FILE_MSG_TMPL, file);
    return logger.error(err);
  }
  logger.warn(util.format(NO_FILE_MSG_TMPL, file));
  file = getPathSync(folder, filename, defaultLocale, tmpl);
  if (!file) { return null; }
  return (cache[cacheKey] = file);
}

function buildFunc() {
  Object.keys(folders).forEach(function(key) {
    var name = util.format('%s%s',
      key.substring(0, 1).toUpperCase(0, 1), key.substring(1));
    var funcFile = util.format(FUNC_FILE_TMPL, name);
    logger.debug(util.format(ADD_FUNC_MSG_TMPL, funcFile));
    module.exports[funcFile] = function(filename, locale, cb) {
      var folder = folders[key];
      var tmpl = folder.template || LOCALE_FILE_TMPL;
      if ('function' === typeof locale) {
        cb = locale; locale = defaultLocale;
      }
      getPath(folder.dir, filename, locale || defaultLocale, tmpl, cb);
    };
    var funcFileSync = util.format(FUNC_FILE_SYNC_TMPL, name);
    logger.debug(util.format(ADD_FUNC_MSG_TMPL, funcFileSync));
    module.exports[funcFileSync] = function(filename, locale) {
      var folder = folders[key];
      var tmpl = folder.template || LOCALE_FILE_TMPL;
      if (arguments.length === 1) { locale = defaultLocale; }
      getPathSync(folder.dir, filename, locale || defaultLocale, tmpl);
    };
  });
}

module.exports.configure = function(options) {
  options = options || {};
  if ('string' === typeof options.defaultLocale) {
    defaultLocale = options.defaultLocale;
  }
  if ('object' === typeof options.folders) {
    folders = options.folders;
  }
  buildFunc();
};

