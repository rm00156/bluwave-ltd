$(function () {
  let table = new DataTable('#optionTypes');

  $('#optionTypes tbody').on('click', 'tr', function (e) {
    var optionTypeId = e.currentTarget.getAttribute('data-optiontypeid');
    window.location = '/admin_dashboard/option_type/' + optionTypeId;
  });

  $('#form').on('submit', addOptionType);
})

function addOptionType(e) {
  $('#error').text('');
  if (form.checkValidity()) {
    e.preventDefault();

    const optionType = $('#optionType').val();

    $.ajax({
      type: 'post',
      url: '/admin_dashboard/option_type/add',
      data: { optionType: optionType },
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