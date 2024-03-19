$(function() {

    if($('#message').val() != undefined) {
        setTimeout(function() {
            $('#toast').removeClass('show');
        }, 5000);
    }

    $('#deleteAccount').on('click', deleteAccount);
    $('#phoneNumber').on('change', validatePhoneNumber);
    $('#form').on('submit', editProfile);
    $('#form2').on('submit', changePassword);
})

function deleteAccount() {

    $.ajax({
        type: 'delete',
        url:'/delete-account',
        success: function(resp, xhr, status) {
            window.location = '/'
        }
    })
}

function changePassword(e){
    const form = document.getElementById('form2');
    if(form.checkValidity()) {
        e.preventDefault();
        $('#passwordError').text('');
        $.ajax({
            type:'post',
            url: '/change-password',
            data: {currentPassword: $('#currentPassword').val(), password: $('#password').val()},
            success: function(resp, xhr, status) {
                if(status.status == 200) {
                    location.reload();
                }
            },
            error: function(resp, xhr, status) {
                $('#passwordError').text(resp.responseJSON.error);
            }
        })
    }
}

function validatePhoneNumber() {
    $('#phoneNumberError').text('');
    $.ajax({
        type: 'get',
        url: '/validate-phone-number',
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

function editProfile(e) {
    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();

        const name = $('#name').val();
        const phoneNumber = $('#phoneNumber').val();

        $.ajax({
            type: 'post',
            url: '/edit-profile',
            data: {name:name, phoneNumber: phoneNumber},
            success: function(resp, xhr, status) {
                if(status.status == 200) {

                    location.reload();
                }
            }
        })

    }
}