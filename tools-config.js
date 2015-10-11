'use strict';

var util = require('util');
var fs = require('fs');
var path = require('path');
var prompt = require('readline-sync');
//require('prompt-sync').prompt;

var folder = './config';
var sampleExt = '.sample';

function merge(from, to, key, concat) {
	var prop;
	if (key === undefined) {
		for (prop in from) {
			merge(from, to, prop, prop);
		}
	} else {
		if (typeof from[key] === 'array' || typeof from[key] === 'object') {
			for (prop in from[key]) {
				if (!to.hasOwnProperty(key)) {
					to[key] = {};
				}
				merge(from[key], to[key], prop, concat+'.'+prop);
			}
		} else {
			if (to[key] === undefined) {
				//process.stdout.write('item "'+concat+'" need a value: ('+
				// from[key]+'): \n')
				//to[key] = prompt()
				to[key] = prompt.question(util.format(
					'item "%s" need a value: (%s): ', concat, from[key]));
				if (to[key] === '') {
					to[key] = from[key];
				}
			}
		}
	}
}

var configFiles = fs.readdirSync('./config');
configFiles.forEach(function(file) {
	if (file.indexOf(sampleExt) === file.length-sampleExt.length) {
		var sample = JSON.parse(fs.readFileSync(path.join(folder, '/', file),
			'utf8'));
		var config = {};
		var filename = path.join(folder, '/',
			file.substr(0, file.length-sampleExt.length));
		if (fs.existsSync(filename)) {
			config = JSON.parse(fs.readFileSync(filename));
		}
		merge(sample, config);
		console.log(config);
		fs.writeFileSync(filename, JSON.stringify(config, null, 4));
	}
});
