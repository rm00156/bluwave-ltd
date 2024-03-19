$(function () {
    let table = new DataTable('#templates');
  
    $('#templates tbody').on('click', 'tr', function (e) {
      var templateId = e.currentTarget.getAttribute('data-templateid');
      window.location = '/admin-dashboard/template/' + templateId;
    });
    // $('#form').on('submit', addProductType);
  })