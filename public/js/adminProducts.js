$(function(){
    let table = new DataTable('#products');

    $('#products tbody').on('click', 'tr', function(e) {
        var productId = e.currentTarget.getAttribute('data-productid');
        window.location = `/admin-dashboard/product/${productId}/page1`;
      });
})