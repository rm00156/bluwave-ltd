// var fileMap = initialiseFileMap();
var basic;
var fileJsonObject;
function initialiseFileMap() {
    var map = new Map();
    map.set(5, null);
    map.set(6, null);
    map.set(7, null);
    map.set(8, null);
    return map;
}

function initialiseFileJsonObject() {
    var jsonObject = {};
    var homePageOptions = JSON.parse($('#homePageOptions').val());
    for (var i = 5; i <= 8; i++) {
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
    $('#error5').text('');
    $('#error6').text('');
    $('#error7').text('');
    $('#error8').text('');
    $('#error').text('');

    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();

        const productTypeId5 = $('#position5').val();
        // const picture1 = fileMap.get(1);
        const description5 = $('#description5').val();

        const productTypeId6 = $('#position6').val();
        // const picture2 = fileMap.get(2);
        const description6 = $('#description6').val();

        const productTypeId7 = $('#position7').val();
        // const picture3 = fileMap.get(3);
        const description7 = $('#description7').val();

        const productTypeId8 = $('#position8').val();
        // const picture4 = fileMap.get(4);
        const description8 = $('#description8').val();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('productTypeId5', productTypeId5);
        // data.append('1Blob',  picture1);
        data.append('description5', description5);

        data.append('productTypeId6', productTypeId6);
        // data.append('2Blob',  picture2);
        data.append('description6', description6);

        data.append('productTypeId7', productTypeId7);
        // data.append('3Blob',  picture3);
        data.append('description7', description7);

        data.append('productTypeId8', productTypeId8);
        // data.append('4Blob',  picture4);
        data.append('description8', description8);


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
                if(errors.error5) {
                    $('#error5').text(response.currentTarget.response.error5);
                    err = 'error5';
                }
                if(errors.error6) {
                    $('#error6').text(response.currentTarget.response.error6);
                    err = 'error6';
                }
                if(errors.error7) {
                    $('#error7').text(response.currentTarget.response.error7);
                    err = 'error7';
                }
                if(errors.error8) {
                    $('#error8').text(response.currentTarget.response.error8);
                    err = 'error8';
                }
                if(errors.error) {
                    $('#error').text(response.currentTarget.response.error);
                    err = 'error';
                }
                const element = document.getElementById(err);
                element.scrollIntoView({ behavior: "smooth" });
            }
            
        });

        request.open('put','/admin_dashboard/home_page_option_5_8/update');
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