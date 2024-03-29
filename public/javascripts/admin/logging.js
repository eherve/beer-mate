'use strict';
/*global $:false */

$(document).ready(function() {

    var div = $('#logging');
    var socket = io.connect(window.location.host + '/admin/logging');
    socket.on('data', function(data) {
      var row = $('<div></div>').addClass('row');
      div.prepend(row);
      var time = $('<div></div>').addClass('col-md-2').addClass('logging-time')
        .html(new Date(data.time));
      row.append(time);
      var level = $('<div></div>').addClass('col-md-1').addClass('logging-level').addClass(data.level)
        .html(data.level);
      row.append(level);
      var logger = $('<div></div>').addClass('col-md-1').addClass('logging-logger')
        .html(data.logger);
      row.append(logger);

      var m = data.msg;
      if (data.meta && Object.keys(data.meta).length > 0) {
        m += ' ' + JSON.stringify(data.meta);
      }
      var msg = $('<div></div>').addClass('col-md-8').addClass('logging-msg')
        .html(m);
      row.append(msg);
    });

});
