'use strict';

process.stopActions = [];

process.onStop = function(action) {
	if (action instanceof Function) {
		process.stopActions.push(action);
	}
};

var _exit = process.exit;
process.exit = process.stop = function(code) {
	var stopActions = process.stopActions || [];
	var index = stopActions.length;
	var errorOccured = false;
	(function exec(err) {
		if (err) {
			errorOccured = true;
		}
		if (index > 0) {
			var act = stopActions[--index];
			if (act.length === 1) { act(exec); }
			else {
				act();
				exec();
			}
		} else {
			_exit(code !== undefined || errorOccured ? -1 : 0);
		}
	}());
};

process.on('SIGINT', process.stop); // catch ctrl-C to quit clean
