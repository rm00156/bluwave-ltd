$(function(){

    $('#form').on('submit', submit);
})

function submit(e) {

    const form = document.getElementById('form');
    $('#emailError').text('');
    if(form.checkValidity()) {
        e.preventDefault();

        const email = $('#email').val();
        $.ajax({
            type: 'post',
            url: '/forgotten-password',
            data: {email:email},
            success: function(resp, xhr, status) {
                if(status.status == 200) {

                    window.location = '/forgotten-password-email-sent'
                }
            },
            error: function(resp, xhr, status) {
                $('#emailError').text(resp.responseJSON.error);
            }
        })
    }
}