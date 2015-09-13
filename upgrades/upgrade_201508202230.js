'use strict';

var path = require('path');
var fs = require('fs');
var CONTENT_FOLDER = path.join(__dirname, 'content');
var DOC_TOS_FR_FILE = path.join(CONTENT_FOLDER,
	'mobile-privacy-policy-geolocated-apps-august-15-2015.fr.html');
var DOC_TOS_EN_FILE = path.join(CONTENT_FOLDER,
	'mobile-privacy-policy-geolocated-apps-august-15-2015.en.html');
var DOC_P_FR_FILE = path.join(CONTENT_FOLDER,
	'mobile-privacy-policy-geolocated-apps-august-15-2015.fr.html');
var DOC_P_EN_FILE = path.join(CONTENT_FOLDER,
	'mobile-privacy-policy-geolocated-apps-august-15-2015.en.html');

module.exports.upgrade = function(cb) {
	var WebContent = require('../models/webContent');
	WebContent.remove({ });
	var date = Date.now();
	var webContentTOU = new WebContent({
		_id: 'TERM_OF_SERVICE',
		versions: [
			{
				_id: '1.0', creationDate: date, modificationDate: date,
				locales: [
					{ _id: 'fr', name: 'Condition d\'utilisation',
						data: fs.readFileSync(DOC_TOS_FR_FILE)},
					{ _id: 'en', name: 'Terms of service',
						data: fs.readFileSync(DOC_TOS_EN_FILE) }
				]
			}
		]
	});
	var webContentPrivacy = new WebContent({
		_id: 'PRIVACY',
		versions: [
			{
				_id: '1.0', creationDate: date, modificationDate: date,
				locales: [
					{ _id: 'fr', name: 'Politique de confidentialité',
						data: fs.readFileSync(DOC_P_FR_FILE)},
					{ _id: 'en', name: 'Privacy',
						data: fs.readFileSync(DOC_P_EN_FILE) }
				]
			}
		]
	});
	WebContent.remove({ $or: [ { _id: 'TERM_OF_SERVICE' }, { _id: 'PRIVACY' } ] },
		function() {
			webContentTOU.save(function(err) {
				if (err) { return cb(err); }
				webContentPrivacy.save(function(err) {
					if (err) { return WebContent.remove({ _id: 'TERM_OF_SERVICE' }, cb); }
					cb();
				});
			});
	});
};
