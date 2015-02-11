'use strict';
/*global $:false */

$(document).ready(function() {

  // Editor - remove

  var removeEditor = new $.fn.dataTable.Editor({
    domTable: '#datatable',
    title: 'Remove pub',
    method: 'DELETE',
    url: '/admin/pubs/remove',
    closeText: 'Close',
    validateText: 'Remove',
    idField: '_id',
    fields: [ { fieldType: 'label', label: 'Delete pub' } ]
  });

  // Datatable

  $('#datatable').dataTable({
    dom: 'T<"clear">lfrtip',
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: '/admin/pubs/datatable',
    aoColumns: [
      { mData: 'name' },
      { mData: 'address.country'},
      { mData: 'address.city' },
      { mData: 'address.street' },
      { mData: 'address.loc', bSortable: false,
        mRender: function(data) {
          return data && data.length === 2 ?
            ('longitude: ' + data[0] + ', latitude: ' + data[1]) : '';
        }
      }
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
          editor: removeEditor, bIsEnabled: true }
      ]
    }
  });
});
