/// <reference path="typings/node/node.d.ts"/>
'use strict';

var express = require('express');
var path = require('path');
var logger = require('logger-factory').expressLogger;
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

if (process.env.NODE_ENV === 'development') {
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTION');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
}

// Routes
require('./routes')(app);

module.exports = app;
