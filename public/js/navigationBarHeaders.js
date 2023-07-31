$(function(){

    $('#saveChanges').on('click', saveChanges);
})

function saveChanges(){

    $('#error').text('');

    const position1 = $('#position1').val();
    const position2 = $('#position2').val();
    const position3 = $('#position3').val();
    const position4 = $('#position4').val();
    const position5 = $('#position5').val();
    const position6 = $('#position6').val();
    const position7 = $('#position7').val();
    const position8 = $('#position8').val();
    const position9 = $('#position9').val();
    const position10 = $('#position10').val();

    const data = {
        position1: position1,
        position2: position2,
        position3: position3,
        position4: position4,
        position5: position5,
        position6: position6,
        position7: position7,
        position8: position8,
        position9: position9,
        position10: position10
    }
    $.ajax({
        type: 'post',
        url: '/set_navigation_bar_headers',
        data: data,
        success: function(resp, xhr, status) {

            if (status.status == 200) {
                location.reload()
            }
        },
        error: function(resp, xhr, status) {
            $('#error').text(resp.responseJSON.error);
        }
    })

}