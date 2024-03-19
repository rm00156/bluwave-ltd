$(function(){
    let table = new DataTable('#orders');

    $('#orders tbody').on('click', 'tr', function(e) {
        var orderId = e.currentTarget.getAttribute('data-orderid');
        window.location = '/admin-dashboard/order/' + orderId;
      });
})