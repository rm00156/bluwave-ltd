$(function(){
    let table = new DataTable('#promoCodes');

    $('#promoCodes tbody').on('click', 'tr', function(e) {
        var promoCodeId = e.currentTarget.getAttribute('data-promocodeid');
        window.location = `/admin-dashboard/promo-code/${promoCodeId}`;
      });
})