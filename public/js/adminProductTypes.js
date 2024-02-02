$(function () {
  let table = new DataTable('#productTypes');

  $('#productTypes tbody').on('click', 'tr', function (e) {
    var productTypeId = e.currentTarget.getAttribute('data-producttypeid');
    window.location = '/admin_dashboard/product_type/' + productTypeId;
  });
  $('#form').on('submit', addProductType);
})

function addProductType(e) {
  $('#error').text('');
  if (form.checkValidity()) {
    e.preventDefault();

    const productType = $('#productType').val();

    $.ajax({
      type: 'post',
      url: '/admin_dashboard/product_type/add',
      data: { productType: productType },
      success: function (response, xhr, status) {

        if (status.status == 201) {
          location.reload();
        }
      },
      error: function (response) {
        $('#error').text(response.responseJSON.error);
      }
    })
  }
}