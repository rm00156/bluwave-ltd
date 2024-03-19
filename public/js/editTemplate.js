$(function () {

    $('#form').on('submit', editTemplate);
});

function editTemplate(e) {
    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();
        
        const templateId = $('#templateId').val();
        const bleedAreaHeight = $('#bleedAreaHeight').val();
        const bleedAreaWidth = $('#bleedAreaWidth').val();
        const trimHeight = $('#trimHeight').val();
        const trimWidth = $('#trimWidth').val();
        const safeAreaHeight = $('#safeAreaHeight').val();
        const safeAreaWidth = $('#safeAreaWidth').val();
        
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
        data.append('deleteFl', deleteFl);

        const pdfTemplate = document.getElementById('pdfTemplate');
        if(pdfTemplate.files.length > 0) {
            data.append('pdfTemplateBlob', pdfTemplate.files[0]);
        }
        const jpgTemplate = document.getElementById('jpgTemplate');
        if(jpgTemplate.files.length > 0) {
            data.append('jpgTemplateBlob', jpgTemplate.files[0]);
        }

        request.addEventListener('load', function(response, xhr, status){
            
            if(request.status == 200) {
                return location.reload();
            } 
            
        });

        request.open('put','/admin-dashboard/template/' + templateId);
        request.send(data);

    } else {
        console.log('invalid')
    } 
}