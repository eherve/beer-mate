'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var hogan = require('hogan');
var logger = require('./logger').get('I18n');

var defaultLocale = 'en';
var directory = path.join(__dirname, 'locales');
var fetchLocale;

var update = false;
var indent = '\t';

var localSymbole = '__i';
var translateAlias = '__';

var locales = {};

function getRequestLocales(req) {
  var languageHeader = req.headers['accept-language'];
  var locales = [];
  if (languageHeader) {
    languageHeader.split(',').forEach(function (l) {
      var header = l.split(';', 1)[0], lr = header.split('-', 2);
      if (lr[0]) {
        locales.push(util.format('%s%s', lr[0].toLowerCase().trim(),
            lr[1] ? util.format('-%s', lr[1].toLowerCase().trim()) : ''));
      }
    });
  }
  return locales;
}

function _fetchLocale(req) {
  var reqLocales = getRequestLocales(req);
  for (var index = 0; index < reqLocales.length; ++index) {
    var l = reqLocales[index];
    if (locales[reqLocales[index]]) { return l; }
  }
  return defaultLocale;
}

function getLocaleFilePath(l) {
  var filepath = path.join(directory, util.format('%s.json', l));
  if (!fs.existsSync(filepath)) {
    return logger.error(util.format('File %s does not exists !', filepath));
  }
  return filepath;
}

function loadLocale(l) {
  var filepath = getLocaleFilePath(l);
  if (!filepath) { return; }
  logger.debug('Loading locale', l);
  try {
    locales[l] = require(filepath);
  } catch(err) { logger.error(err); }
}

module.exports.configure = function(options) {
  options = options || {};
  logger.debug(util.format('configure(%s)', util.inspect(options, false, 0)));
  if (!options.locales || !util.isArray(options.locales) ||
      options.locales.length === 0) {
    return logger.error('No possible locales specified !');
  }
  if ('string' === typeof options.defaultLocale) {
    defaultLocale = options.defaultLocale;
  } else { defaultLocale = options.locales[0]; }
  if ('string' === typeof options.directory) {
    directory = options.directory;
  }
  if (!fs.existsSync(directory)) {
    return logger.error(
        util.format('Directory %s does not exists !', directory));
  }
  if ('function' === typeof options.fetchLocale) {
    fetchLocale = options.fetchLocale;
  } else { fetchLocale = _fetchLocale; }
  options.locales.forEach(function(l) { loadLocale(l); });
  if (options.update === true) { update = true; }
  if ('string' === typeof options.indent) { indent = options.indent; }
  if ('string' === typeof options.localSymbole) {
    localSymbole = options.localSymbole;
  }
  if ('string' === typeof options.translateAlias) {
    translateAlias = options.translateAlias;
  }
  module.exports[translateAlias] = module.exports.translate;
  return true;
};

module.exports.getLocale = function() {
  if ('string' === typeof this.locale) { return this.locale; }
  return defaultLocale;
};

module.exports.init = function(req, res, next) {
  var locale = fetchLocale(req);
  req.locale = res.locale = locale;
  req.getLocale = res.getLocale = module.exports.getLocale;
  req.setLocale = res.setLocale = module.exports.setLocale;
  req.translate = res.translate = module.exports.translate;
  res.locals.locale = locale;
  res.locals[localSymbole] = module.exports.translate.bind(res);
  req[translateAlias] = res[translateAlias] = module.exports.translate;
  next();
};

module.exports.setLocale = function(locale) {
  if ('string' === typeof this.locale) { this.locale = locale; }
  defaultLocale = locale;
};

function render(strValue, options) {
  var data = options.data || {};
  return hogan.compile(strValue).render(data);
}

function updateLocale(locale, cb) {
  var filename = util.format('%s.json', locale);
  var filepath = path.join(directory, filename);
  logger.debug(util.format('Update locale file "%s"', filename));
  fs.writeFile(filepath, JSON.stringify(locales[locale] || {}, null, indent),
      { encoding: 'utf8' }, function(err) {
    if (cb) { return cb(err); }
    if (err) {
      logger.error(util.format('Writing file "%s" error: %s', filepath, err));
    }
    logger.debug(util.format('Locale file "%s" updated', filename));
  });
}

function unknownKey(locale, dict, key) {
  logger.debug(
      util.format('Unknown translation key "%s" for locale "%s" !',
        key, locale));
  dict[key] = (key ? key : null);
  if (update === true) { updateLocale(locale); }
  return key;
}

function translate(locale, dict, key, options) {
  var value = dict[key];
  if (value === undefined) { return unknownKey(locale, dict, key); }
  if (value === null) { return key; }
  if ('string' === typeof value) { return render(value, options); }
  if (options.key && 'string' === typeof value[options.key]) {
    return render(value[options.key], options);
  }
  if ('string' === typeof value.default) {
      return render(value.default, options);
  }
  logger.error(
      util.format('Unmanage translation key value "%s" with options "%s"',
        util.inspect(value), util.inspect(options)));
  return key;
}

module.exports.translate = function(key, locale, options) {
  var getLocale = ('function' === typeof this.getLocale ?
    this.getLocale.bind(this) : function() { return defaultLocale; });
  if (arguments.length === 2) {
    if ('string' === typeof locale) {
      options = {};
    } else {
      options = locale;
      locale = getLocale();
    }
  } else if (arguments.length === 1) {
    options = {};
    locale = getLocale();
  }
  options = options || {};
  logger.debug(util.format('translate(%s, %s, %s)',
        key, locale, util.inspect(options)));
  var dict = (locales[locale] || locales[defaultLocale]);
  return dict ? translate(locale, dict, key, options) : key;
};

