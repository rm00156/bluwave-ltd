$(function(){
    new DataTable('#homePageOptions');

    $('#homePageOptions').on('click', 'tr', function(e) {
        var id = e.currentTarget.getAttribute('data-optionid');
        window.location = `/admin_dashboard/home_page_option/${id}`;
      });
})