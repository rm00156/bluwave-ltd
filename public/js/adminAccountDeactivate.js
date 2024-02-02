$(function() {
    $('#deactivateAccount').on('click', deactivateAccount);
    $('#reactivateAccount').on('click', reactivateAccount);
})

function deactivateAccount() {

    const accountId = $('#accountId').val();
    $.ajax({
        type: 'delete',
        url: `/account/${accountId}/deactivate`,
        success: function(resp, xhr, status) {

            if(status.status == 200) {
                location.reload();
            }
        }
    })
}

function reactivateAccount() {

    const accountId = $('#accountId').val();
    $.ajax({
        type: 'put',
        url: `/account/${accountId}/reactivate`,
        success: function(resp, xhr, status) {

            if(status.status == 200) {
                location.reload();
            }
        }
    })
}