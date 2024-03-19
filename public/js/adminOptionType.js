$(function () {
    let table = new DataTable('#options');

    $('#options tbody').on('click', 'tr', function (e) {
        var optionId = e.currentTarget.getAttribute('data-optionid');
        window.location = '/admin-dashboard/option/' + optionId;
    });

    $('#form').on('submit', addOption);
})

function addOption(e) {
    $('#error').text('');
    if(form.checkValidity()) {
        e.preventDefault();

        const option = $('#option').val();

        $.ajax({
            type:'post',
            url:'/admin-dashboard/option/add',
            data: {option:option, optionTypeId: $('#optionTypeId').val()},
            success: function(response, xhr, status) {

                if(status.status == 201) {
                    location.reload();
                }
            },
            error: function(response) {
                $('#error').text(response.responseJSON.error);
            }
        })
    }
}