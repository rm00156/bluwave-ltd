$(function () {
    let table = new DataTable('#faqs');
  
    $('#faqs tbody').on('click', 'tr', function (e) {
      var faqId = e.currentTarget.getAttribute('data-faqid');
      window.location = '/admin_dashboard/faq/' + faqId;
    });
    // $('#form').on('submit', addProductType);
  })