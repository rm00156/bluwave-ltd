$(function(){

    $('#form').on('submit', submit);
})

function submit(e) {

    const form = document.getElementById('form');
    $('#passwordError').text('');
    
    if(form.checkValidity()) {
        e.preventDefault();

        const password = $('#password').val();
        const rePassword = $('#rePassword').val();
        const data = {password: password, rePassword: rePassword, forgottenPasswordId: $('#forgottenPasswordId').val()};

        $.ajax({
            type: 'post',
            url: '/reset_password',
            data: data,
            success: function(resp, xhr, status) {
                if(status.status == 200) {
                    window.location = '/password_reset'
                }
            },
            error: function(resp, xhr, status) {
                if(resp.responseJSON.error == "Passwords don't match") {
                    $('#passwordError').text(resp.responseJSON.error);
                } else {
                    window.location = `/reset_password/account/${resp.responseJSON.accountId}/forgottenPassword/${resp.responseJSON.token}`
                }
                
            }
        })
    }
}