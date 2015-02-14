'use strict';
/*global $:false */

$(document).ready(function() {

  $('.logger-info-level').change(function() {
    var opt = $(this).children('option:selected');
    var data = {
      logger: opt.attr('logger'),
      transport: opt.attr('transport'),
      level: opt.val()
    };
    $.ajax({ url: 'logger', method: 'post', data: data });
  });

});
