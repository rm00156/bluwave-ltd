$(function(){
    let table = new DataTable('#sales');

    $('#sales tbody').on('click', 'tr', function(e) {
        var saleId = e.currentTarget.getAttribute('data-saleid');
        window.location = `/admin-dashboard/sale/${saleId}`;
      });
})