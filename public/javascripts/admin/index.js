'use strict';
/*global $:false */

$(document).ready(function() {

  $('.form-signin').submit(function(event) {
    event.preventDefault();
    var form = $(this);
    $.ajax({
      type: form.attr('method'),
      url: form.attr('action'),
      data: form.serialize()
    })
    .done(function(msg) { location.reload(); })
    .fail(function(jqXHR, textStatus) {
      form.children('div').addClass('has-error');
      console.error(textStatus, jqXHR);
    });
    return false;
  });

});
