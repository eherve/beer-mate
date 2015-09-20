var fs = require('fs');
var prompt = require('readline-sync')//require('prompt-sync').prompt;

var folder = './config';
var sampleExt = '.sample';

function merge(from, to, key, concat) {
    if (key == undefined) {
	for (var prop in from) {
	    merge(from, to, prop, prop);
	};		
    } else {
	if (typeof from[key] == 'array' || typeof from[key] == 'object') {
	    for (var prop in from[key]) {
		if (!to.hasOwnProperty(key)) {
		    to[key] = {}
		}
		merge(from[key], to[key], prop, concat+'.'+prop);
	    }
	} else {
	    if (to[key] == undefined) {
		//process.stdout.write('item "'+concat+'" need a value: ('+from[key]+'): \n')
		//to[key] = prompt()
		to[key] = prompt.question('item "'+concat+'" need a value: ('+from[key]+'): ');
		if (to[key] == '') {
		    to[key] = from[key]
		}
	    }
	}
    }
}

var configFiles = fs.readdirSync('./config');
configFiles.forEach(function(file) {
    if (file.indexOf(sampleExt) == file.length-sampleExt.length) {
	var sample = JSON.parse(fs.readFileSync(folder+'/'+file, "utf8"));
	var config = {};
	var filename = folder+'/'+file.substr(0, file.length-sampleExt.length)
	if (fs.existsSync(filename)) {
	    var config = JSON.parse(fs.readFileSync(filename));
	}

	merge(sample, config);
	console.log(config);
	fs.writeFileSync(filename, JSON.stringify(config, null, 4));
    }
});
