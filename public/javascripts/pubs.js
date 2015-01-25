$(document).ready(function() {
  $('#datatable').dataTable({
    bFilter: true,
    bProcessing: true,
    bServerSide: true,
    sAjaxSource: '/pubs/datatable',
    aoColumns: [
      { mData: 'name' },
      { mRender: function(data, type, full) {
          return full.address.street + " " + full.address.city + ", " +
            full.address.country;
        }
      },
      { mData: 'address.loc' },
      { mData: 'days', sDefaultContent: '' },
      { mData: 'address.country', bVisible: false },
      { mData: 'address.city', bVisible: false },
      { mData: 'address.street', bVisible: false }
    ],
    fnServerParams: function(aoData) {
      aoData.push({ name: "bChunkSearch", value: true }); }
  });
});
