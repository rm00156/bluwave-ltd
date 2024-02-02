$(function() {

    $('#phoneNumber').on('change', validatePhoneNumber);
})

function validatePhoneNumber() {
    $('#phoneNumberError').text('');
    $.ajax({
        type: 'get',
        url: '/validate_phone_number',
        data: {phoneNumber: $('#phoneNumber').val()},
        success: function(response, xhr, status) {

            const errors = response.errors;
            if(status.status == 200) {
                if(errors.length > 0) {
                    $('#phoneNumber').val('');
                    $('#phoneNumberError').text(errors[0]);
                }
            }
        }
    })
}