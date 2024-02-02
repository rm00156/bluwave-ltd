$(function () {

    $('#form').on('submit', addFaq);
});

function addFaq(e) {
    $('#questionError').text('');

    const form = document.getElementById('form');
    if (form.checkValidity()) {
        e.preventDefault();

        var statusList = document.getElementsByName('statusOptions');
        var deleteFl = false;

        for (var i = 0; i < statusList.length; i++) {
            if (statusList[i].value == 'deactive' && statusList[i].checked == true)
                deleteFl = true;
        }
        const data = {
            question: $('#question').val(),
            answer: $('#answer').val(),
            deleteFl: deleteFl,
            faqTypeId: $('#faqType').val()
        };

        $.ajax({
            url: '/admin_dashboard/faq/add',
            type: 'post',
            data: data,
            success: function(resp, xhr, status) {
                if(status.status == 201) {
                    location.reload();
                }
            },
            error: function(resp, xhr, status) {
                $('#questionError').text('Question already exists.');
            }
        })
    }

}