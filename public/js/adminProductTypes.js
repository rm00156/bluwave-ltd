$(function(){
    let table = new DataTable('#productTypes');

    $('#productTypes tbody').on('click', 'tr', function(e) {
        var productTypeId = e.currentTarget.getAttribute('data-producttypeid');
        window.location = '/admin_dashboard/product_type/' + productTypeId;
      });
})