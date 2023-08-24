$(function () {

    $('#form').on('submit', editFaq);
});

function editFaq(e) {
    const form = document.getElementById('form');
    if (form.checkValidity()) {
        e.preventDefault();

        const faqId = $('#faqId').val();
        const question = $('#question').val();
        const answer = $('#answer').val();
        const faqTypeId = $('#faqType').val();

        var statusList = document.getElementsByName('statusOptions');
        var deleteFl = false;

        for (var i = 0; i < statusList.length; i++) {
            if (statusList[i].value == 'deactive' && statusList[i].checked == true)
                deleteFl = true;
        }

        const data = { question: question, answer: answer, faqTypeId: faqTypeId, deleteFl: deleteFl };
        $.ajax({
            type: 'put',
            url: '/admin_dashboard/faq/' + faqId,
            data: data,
            success: function (resp, xhr, status) {

                if (status.status == 200) {
                    location.reload();
                }
            },
            error: function (resp, xhr, status) {
                $('#questionError').text(resp.responseJSON.error);
            }
        })

    } else {
        console.log('invalid')
    }
}