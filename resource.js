'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var hogan = require('hogan');
var logger = require('./logger').get('Resource');

var FUNC_FILE_TMPL = 'get%sFile';
var NO_FILE_MSG_TMPL = 'File %s does not exists !';
var ADD_FUNC_MSG_TMPL = 'Add function %s !';

var debug = false;

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
  if (options.template) {
    file = path.join(rootFolder, hogan.compile(options.template)
      .render({ locale: locale, filename: filename }));
  } else { file = path.join(rootFolder, locale, filename); }
  fs.exists(file, function(exists) {
    if (exists) { cache[cacheKey] = file; return cb(null, file); }
    if (locale === defaultLocale) {
      var err = util.format(NO_FILE_MSG_TMPL, file);
      logger.error(err); return cb(new Error(err));
    }
    logger.warn(util.format(NO_FILE_MSG_TMPL, file));
    getPath(rootFolder, filename, defaultLocale, options, function(err, file) {
      if (err) { return cb(err); }
      cache[cacheKey] = file; cb(null, file);
    });
  });
}

function buildFunc() {
  Object.keys(folders).forEach(function(key) {
    var name = util.format('%s%s', key.substring(0, 1).toUpperCase(0, 1),
      key.substring(1));
    var funcFile = util.format(FUNC_FILE_TMPL, name);
    logger.debug(util.format(ADD_FUNC_MSG_TMPL, funcFile));
    module.exports[funcFile] = function(filename, locale, options, cb) {
      var folder = folders[key];
      if ('function' === typeof locale) { cb = locale; options = {}; locale = defaultLocale; }
      if ('function' === typeof options) { cb = options; options = {}; }
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
  if ('string' === typeof options.defaultLocale) {
    defaultLocale = options.defaultLocale;
  }
  if ('object' === typeof options.folders) { folders = options.folders; }
  buildFunc();
};

