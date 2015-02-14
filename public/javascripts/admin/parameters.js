'use strict';
/*global $:false */

$(document).ready(function() {

  // Datatable

  $('#datatable').dataTable({
    dom: '<"clear">lfrtip',
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: 'parameters/datatable',
    aoColumns: [
      { mData: 'name' },
      { mData: 'value', sDefaultContent: '' }
    ],
    fnServerParams: function(aoData) {
      aoData.push({ name: 'bChunkSearch', value: true });
    }
  });

});
