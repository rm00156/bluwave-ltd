// var fileMap = initialiseFileMap();
var basic;
var fileJsonObject;
function initialiseFileMap() {
    var map = new Map();
    map.set(1, null);
    map.set(2, null);
    map.set(3, null);
    map.set(4, null);
    return map;
}

function initialiseFileJsonObject() {
    var jsonObject = {};
    var homePageOptions = JSON.parse($('#homePageOptions').val());
    for (var i = 1; i < 6; i++) {
        jsonObject[i] = { path: homePageOptions['imagePath' + i ], blob: null, remove: false };
    }
    
    return jsonObject;
}

function removePicture(event) {
    const button = event.currentTarget;
    const label = button.parentNode;
    const container = label.parentNode;
    const input = container.getElementsByClassName('picture')[0];
    console.log(input)
    input.value = null;
    var position = Number((input.id).replace('picture', ''));
    fileJsonObject[position] = { path: fileJsonObject[position].path, blob: null, remove: true };
    var event = new Event('change');

    // Dispatch the event on the file input element
    input.dispatchEvent(event);
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

        var position = Number(pictureAttribute.replace('picture', ''));
        fileJsonObject[position] = { path: fileJsonObject[position].path, blob, remove: false };
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
        $('#reset').on('click', function () {


        });

        // $('#confirmPicture').on('click', confirmPicture);

    })
}

function setHomePageOption(e) {
    $('#error1').text('');
    $('#error2').text('');
    $('#error3').text('');
    $('#error4').text('');
    $('#error').text('');

    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();

        const productTypeId1 = $('#position1').val();
        // const picture1 = fileMap.get(1);
        const description1 = $('#description1').val();

        const productTypeId2 = $('#position2').val();
        // const picture2 = fileMap.get(2);
        const description2 = $('#description2').val();

        const productTypeId3 = $('#position3').val();
        // const picture3 = fileMap.get(3);
        const description3 = $('#description3').val();

        const productTypeId4 = $('#position4').val();
        // const picture4 = fileMap.get(4);
        const description4 = $('#description4').val();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('productTypeId1', productTypeId1);
        // data.append('1Blob',  picture1);
        data.append('description1', description1);

        data.append('productTypeId2', productTypeId2);
        // data.append('2Blob',  picture2);
        data.append('description2', description2);

        data.append('productTypeId3', productTypeId3);
        // data.append('3Blob',  picture3);
        data.append('description3', description3);

        data.append('productTypeId4', productTypeId4);
        // data.append('4Blob',  picture4);
        data.append('description4', description4);


        for (key in fileJsonObject) {
            const item = fileJsonObject[key];
            data.append(key + 'Blob', item.blob);
        }
        request.addEventListener('load', function(response, xhr, status){
            
            if(request.status == 200) {
                location.reload();
            } else {
                const errors = response.currentTarget.response;
                var err = '';
                if(errors.error1) {
                    $('#error1').text(response.currentTarget.response.error1);
                    err = 'error1';
                }
                if(errors.error2) {
                    $('#error2').text(response.currentTarget.response.error2);
                    err = 'error2';
                }
                if(errors.error3) {
                    $('#error3').text(response.currentTarget.response.error3);
                    err = 'error3';
                }
                if(errors.error4) {
                    $('#error4').text(response.currentTarget.response.error4);
                    err = 'error4';
                }
                if(errors.error) {
                    $('#error').text(response.currentTarget.response.error);
                    err = 'error';
                }
                const element = document.getElementById(err);
                element.scrollIntoView({ behavior: "smooth" });
            }
            
        });

        request.open('put','/admin_dashboard/home_page_option/update');
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

    fileJsonObject = initialiseFileJsonObject();
    $('.picture').on('change', setupCropWindow);
    $('#confirmCrop').on('click', confirmCrop);
    $('#cancelCrop').on('click', cancelCrop);
    $('.small-button').on('click', removePicture);
    $('#form').on('submit', setHomePageOption);
})