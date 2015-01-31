'use strict';

var express = require('express');
var path = require('path');
var logger = require('./logger').expressLogger;
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
require('./passport');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Session
// var sessionConfig = require('./config/application.json').session;
// if (sessionConfig.redis) {
//   var RedisStore = require('connect-redis')(session);
//   app.use(session({
//     'store': new RedisStore(sessionConfig.redis),
//     'secret': sessionConfig.secret
//   }));
// } else { app.use(session(sessionConfig)); }

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
require('./router')(app);

module.exports = app;
