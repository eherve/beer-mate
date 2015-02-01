'use strict';
/*global $:false */

$(document).ready(function() {
  $('#datatable').dataTable({
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: '/users/datatable',
    aoColumns: [
      { mData: 'email' },
      { mData: 'validated' },
      { mData: 'administrator' }
    ],
    fnServerParams: function(aoData) {
      aoData.push({ name: 'bChunkSearch', value: true }); }
  });
});
