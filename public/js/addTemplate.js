$(function () {

    $('#form').on('submit', addTemplate);
});

function addTemplate(e) {
    $('#error').text('');
    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();
        
        const size = $('#size').val();
        const bleedAreaHeight = $('#bleedAreaHeight').val();
        const bleedAreaWidth = $('#bleedAreaWidth').val();
        const trimHeight = $('#trimHeight').val();
        const trimWidth = $('#trimWidth').val();
        const safeAreaHeight = $('#safeAreaHeight').val();
        const safeAreaWidth = $('#safeAreaWidth').val();
        const pdfTemplate = document.getElementById('pdfTemplate').files[0];
        const jpgTemplate = document.getElementById('jpgTemplate').files[0];

        var statusList = document.getElementsByName('statusOptions');
        var deleteFl = false;

        for (var i = 0; i < statusList.length; i++) {
            if (statusList[i].value == 'deactive' && statusList[i].checked == true)
                deleteFl = true;
        }

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('bleedAreaHeight', bleedAreaHeight);
        data.append('bleedAreaWidth', bleedAreaWidth);
        data.append('trimHeight', trimHeight);
        data.append('trimWidth', trimWidth);
        data.append('safeAreaHeight', safeAreaHeight);
        data.append('safeAreaWidth', safeAreaWidth);
        data.append('pdfTemplateBlob', pdfTemplate);
        data.append('jpgTemplateBlob', jpgTemplate);
        data.append('deleteFl', deleteFl);
        data.append('size', size);
        request.addEventListener('load', function(response, xhr, status){
            
            if(request.status == 201) {
                return location.reload();
            } 
            
        });

        request.open('post','/admin_dashboard/template/add');
        request.send(data);

    } else {
        console.log('invalid')
    } 
}