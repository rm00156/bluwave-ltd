$(function(){
    let table = new DataTable('#orders');

    $('#orders tbody').on('click', 'tr', function(e) {
        const orderId = e.currentTarget.getAttribute('data-orderid');
        window.location = '/admin_dashboard/order/' + orderId;
      });
})