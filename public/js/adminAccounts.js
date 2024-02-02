$(function(){
    let table = new DataTable('#accounts');

    $('#accounts tbody').on('click', 'tr', function(e) {
        var accountId = e.currentTarget.getAttribute('data-accountid');
        window.location = '/admin_dashboard/account/' + accountId;
      });
})