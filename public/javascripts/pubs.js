'use strict';
/*global $:false */

$(document).ready(function() {
  $('#datatable').dataTable({
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: '/pubs/datatable',
    aoColumns: [
      { mData: 'name' },
      { mRender: function(data, type, full) {
          return full.address.street + ' ' + full.address.city + ', ' +
            full.address.country;
        }
      },
      { mData: 'address.loc',
        mRender: function(data) {
          return data && data.length === 2 ?
            ('longitude: ' + data[0] + ', latitude: ' + data[1]) : '';
        }
      },
      { mData: 'days', sDefaultContent: '' }, // TODO
      { mData: 'address.country', bVisible: false },
      { mData: 'address.city', bVisible: false },
      { mData: 'address.street', bVisible: false }
    ],
    fnServerParams: function(aoData) {
      aoData.push({ name: 'bChunkSearch', value: true }); }
  });
});
