$(function(){

    $('#picture').on('change', uploadPicture);
    $('.remove-item').on('click', removeFileGroupItem);
})

function removeFileGroupItem(e) {

    const basketItemId = e.currentTarget.getAttribute('data-basketitemid');
    const fileGroupItemId = e.currentTarget.getAttribute('data-filegroupitemid');

    const data = {basketItemId: basketItemId, fileGroupItemId: fileGroupItemId};
    console.log('reece')
    $.ajax({
        type: 'delete',
        url: '/remove_file_group_item',
        data: data,
        success: function(req, xhr, status) {

            if(status.status == 200) {
                return location.reload();
            }
        }
    })
}

function uploadPicture(e) {

    var fileInput = document.getElementById('picture');

    // Retrieve the selected file
    var file = fileInput.files[0];

    var data = new FormData();
    data.append('file', file);
    data.append('basketItemId', $('#basketItemId').val() )

    var request = new XMLHttpRequest();
    request.responseType = 'json';

    request.addEventListener('load', function(response){
            
        return location.reload();
        
    });

    request.open('post','/design_upload');
    request.send(data);
}