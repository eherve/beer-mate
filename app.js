'use strict';

var express = require('express');
var fs = require('fs');
var path = require('path');
var logger = require('./logger').expressLogger;
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// I18n
app.use(require('./i18n').init);

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var publicFolder = path.join(__dirname, 'public');
app.use(express.static(publicFolder));

// Favicon
var faviconFile = path.join(publicFolder, 'favicon.ico');
if (fs.existsSync(faviconFile)) {
  var favicon = require('serve-favicon');
  app.use(favicon(faviconFile));
}

// Routes
require('./routes')(app);

module.exports = app;
