var pictureJson = {path: null , blob: null, remove: true};

function removePicture(event) {
    const button = event.currentTarget;
    console.log(event.target)
    const label = button.parentNode.getElementsByClassName('label')[0];
    const container = label.parentNode;
    const input = container.getElementsByClassName('picture')[0];
    console.log(label)
    input.value = null;
    pictureJson = {path: pictureJson.path, blob: null, remove: true};
    var newEvent = new Event('change');

    // Dispatch the event on the file input element
    input.dispatchEvent(newEvent);
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
    
    var labelText = 'Add Banner Picture';
    labelElement.textContent = labelText;
}

function setupCropWindow(event)
{
    const input = event.currentTarget;
    var file = $('#' + input.id).prop('files');

    console.log(file);
    if(file.length == 0)
    {
        resetLabel(input);        
    }
    else if(file[0].size > 100000000)
    {
        resetLabel(input);

        $('#' + input.id + 'Error').text('The picture must not exceed size of 100MB');    
    }
    else
    {   
        file = file[0];
        console.log(file)
        $('#overlay').attr('style','display:block;z-index:99999');
        $('#gif').attr('style','display:flex;justify-content: center');
        
        url = URL.createObjectURL(file);
        var e = document.getElementById('uploadedImageForCrop');
          // 272
          basic = new Croppie(e,{
              viewport: {
                  width: 500,
                  height: 100
              },
              enableOrientation:true,
              enableExif:true });
      
          basic.bind({
              url: url
          })

          $('#rotate').on('click',function(e){
              basic.rotate(parseInt(e.currentTarget.getAttribute('data-deg')));
          });

          $('#gif').attr('style','display:none');
          var confirmCropElement = document.getElementById('confirmCrop');
          confirmCropElement.setAttribute('data-picture', input.id);
    }
}

function confirmCrop(event)
{
    // var canvas = document.getElementById('canvas');
    // var ctx = canvas.getContext("2d");
    const pictureAttribute = event.currentTarget.getAttribute('data-picture');
    const pictureElement = document.getElementById(pictureAttribute);
    const labelElement = pictureElement.parentNode.getElementsByClassName('label')[0];
    const container = labelElement.parentNode;
    basic.result({type:'blob',
        size:'original',
        quality:0.90,
        format:'jpeg'}).then(function(blob) {

            pictureJson = {path: pictureJson.path, blob, remove: false };
            // $('#uploadedImageForCrop').empty();
            // $('#cropSection').attr('style','display:none');
            $('#overlay').attr('style','display:none');
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
            $('#reset').on('click', function(){
                
                
            });

            // $('#confirmPicture').on('click', confirmPicture);

        })
}

function addProductType(e) {
    $('#error').text('');
    const form = document.getElementById('form');
    if(form.checkValidity()) {
        e.preventDefault();


        if(picture1Error()) {
            return;
        }

        const productTypeName = $('#name').val();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('productTypeName', productTypeName);
        data.append('bannerBlob',  pictureJson.blob);

        request.addEventListener('load', function(response, xhr, status){
            
            if(request.status == 201) {
                return window.location = '/admin-dashboard/product-types';
            } else {
                
                $('#error').text(response.currentTarget.response.error);
            }
            
        });

        request.open('post','/admin-dashboard/product-type/add');
        request.send(data);

    } else {
        console.log('invalid')
        picture1Error();
    } 
}

function picture1Error() {
    $('#picture1Error').text('');

    const picture1 = pictureJson;
    if(picture1.remove == true) {
        $('#picture1Error').text('Make sure the Banner Image has been set');
        return true
    }

    return false;
}

function cancelCrop()
{
    basic.destroy();
    $('#uploadedImageForCrop').empty();
    $('#overlay').attr('style','display:none');
}

$(function(){

    $('#confirmCrop').on('click', confirmCrop);
    $('#cancelCrop').on('click', cancelCrop);
    $('.picture').on('change', setupCropWindow);
    $('.small-button').on('click', removePicture);
    $('#form').on('submit', addProductType);
})