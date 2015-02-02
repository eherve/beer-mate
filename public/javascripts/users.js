'use strict';
/*global $:false */

$(document).ready(function() {

  // Functions

  function removeEnabled(selected, button) {
  /*
    for (var index = 0; index < selected.length; ++index) {
      if (selected[index]._id.toString() == userId.toString()) return false;
    }
    */
    return true;
  }

  // Editor - remove

  var removeEditor = new $.fn.dataTable.Editor({
    domTable: '#datatable',
    title: 'Remove user',
    method: 'DELETE',
    url: '/api/users/remove',
    closeText: 'Close',
    validateText: 'Remove',
    idField: '_id',
    fields: [ { fieldType: 'label', label: 'Delete user' } ]
  });

  // Datatable

  $('#datatable').dataTable({
    dom: 'T<"clear">lfrtip',
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: '/users/datatable',
    aoColumns: [
      { mData: 'email' },
      { mData: 'validated', sDefaultContent: '' },
      { mData: 'administrator' },
    ],
    fnServerParams: function(aoData) {
      aoData.push({ name: 'bChunkSearch', value: true });
    },
    tableTools: {
      sRowSelect: 'multi',
      fnPreRowSelect: function(event, node) {
        if (!event) { return true; }
        if (event && (event.ctrlKey || event.metaKey)) {
          return true;
        }
        this.fnSelectNone();
        return true;
      },
      sSelectedClass: 'active',
      aButtons: [
        'select_all', 'select_none',
        { sExtends: 'remove_button', sButtonText: 'Remove',
          editor: removeEditor, bIsEnabled: removeEnabled }
      ]
    }
  });

});
