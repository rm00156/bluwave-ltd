
var basic;
let initialImagePath;
let imageBlob;
let remove = false;

function removePicture(event) {
    const button = event.currentTarget;
    const label = button.parentNode;
    const container = label.parentNode;
    const input = container.getElementsByClassName('picture')[0];
    input.value = null;
    imageBlob = null;
    var event = new Event('change');

    // Dispatch the event on the file input element
    input.dispatchEvent(event);
    remove = true;
}

function resetLabel(input) {
    // todo need a map of pictures
    const labelElement = input.parentNode.getElementsByClassName('label')[0];
    labelElement.classList.add('dropzone')
    labelElement.style.backgroundImage = "";
    labelElement.style.backgroundSize = '';
    labelElement.style.backgroundPosition = '';
    const button = labelElement.parentNode.getElementsByClassName('small-button')[0];
    button.parentNode.removeChild(button);
    
    var labelText = 'Add Image';
    labelElement.textContent = labelText;
}

function setupCropWindow(event) {
    const input = event.currentTarget;
    var file = $('#' + input.id).prop('files');
    // const canvas = document.getElementById("canvas");
    // const ctx = canvas.getContext("2d");
    console.log(file);
    if (file.length == 0) {
        resetLabel(input);
        // $('#' + input.id + 'Error').text('No picture has been selected for upload');

    }
    else if (file[0].size > 100000000) {
        resetLabel(input);

        $('#' + input.id + 'Error').text('The picture must not exceed size of 100MB');
    }
    else {
        file = file[0];
        console.log(file)
        $('#overlay').attr('style', 'display:block;z-index:99999');
        $('#gif').attr('style', 'display:flex;justify-content: center');

        url = URL.createObjectURL(file);
        var e = document.getElementById('uploadedImageForCrop');
        // 272
        basic = new Croppie(e, {
            viewport: {
                width: 200,
                height: 200
            },
            enableOrientation: true,
            enableExif: true
        });

        basic.bind({
            url: url
        })

        $('#rotate').on('click', function (e) {
            basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
        });

        $('#gif').attr('style', 'display:none');
        var confirmCropElement = document.getElementById('confirmCrop');
        confirmCropElement.setAttribute('data-picture', input.id);
    }
}

function confirmCrop(event) {
    // var canvas = document.getElementById('canvas');
    // var ctx = canvas.getContext("2d");
    const pictureAttribute = event.currentTarget.getAttribute('data-picture');
    const pictureElement = document.getElementById(pictureAttribute);
    const labelElement = pictureElement.parentNode.getElementsByClassName('label')[0];
    const container = labelElement.parentNode;
    basic.result({
        type: 'blob',
        size: 'original',
        quality: 0.90,
        format: 'jpeg'
    }).then(function (blob) {

        imageBlob = blob;
        // $('#uploadedImageForCrop').empty();
        // $('#cropSection').attr('style','display:none');
        $('#overlay').attr('style', 'display:none');
        // $('#canvas').attr('style','display:block;width:100%');
        var uri = URL.createObjectURL(blob);

        labelElement.classList.remove('dropzone')
        labelElement.style.backgroundImage = "url('" + uri + "')";
        labelElement.style.backgroundSize = 'cover';
        labelElement.style.backgroundPosition = 'center';
        labelElement.textContent = '';

        const button = document.createElement('button');
        button.classList.add('small-button');
        button.classList.add('btn');
        button.classList.add('btn-danger');
        button.addEventListener('click', removePicture)
        button.append('X');
        container.append(button);
        basic.destroy();
        remove = false;
        $('#reset').on('click', function () {


        });

        // $('#confirmPicture').on('click', confirmPicture);

    })
}


function setHomePageOption(e) {

    $('#error').text('')
    const homePageOptionId = $('#homePageOptionId').val();
    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();

        if(remove)
            return $('#error').text('Image must be set.');

        const productTypeId = $('#productTypeId').val();
        const description = $('#description').val();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('productTypeId', productTypeId);
        data.append('description', description);

        if(imageBlob !== null)
            data.append('image', imageBlob);

        request.addEventListener('load', function(response, xhr, status){
            
            if(request.status == 200) {
                location.reload();
            } else {

                $('#error').text(response.currentTarget.response.error);
               
                const element = document.getElementById('error');
                element.scrollIntoView({ behavior: "smooth" });
            }
            
        });

        request.open('put',`/home-page-option/${homePageOptionId}/update`);
        request.send(data);

    } 
}

function cancelCrop()
{
    basic.destroy();
    $('#uploadedImageForCrop').empty();
    $('#overlay').attr('style','display:none');
}

$(function(){

    initialImagePath = $('#imagePath').val();
    $('.picture').on('change', setupCropWindow);
    $('#confirmCrop').on('click', confirmCrop);
    $('#cancelCrop').on('click', cancelCrop);
    $('.small-button').on('click', removePicture);
    $('#form').on('submit', setHomePageOption);
})