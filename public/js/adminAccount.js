$(function() {

    $('#sendEmail').on('click', sendEmail);
})

function sendEmail() {

    $.ajax({
        type: 'post',
        url: '/forgotten_password',
        data: {email: $('#email').val()},
        success: function(resp, xhr, status){
            if(status.status == 200) {
                location.reload();
            }
        }
    })
}