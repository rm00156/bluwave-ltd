var rowCount = 1;
var fileMap = initialiseFileMap();
var url;
var basic;
var fileJsonObject = initialiseFileJsonObject();

function initialiseFileMap() {
    var map = new Map();
    map.set(1, null);
    map.set(2, null);
    map.set(3, null);
    map.set(4, null);
    map.set(5, null);
    return map;
}

function initialiseFileJsonObject() {
    var jsonObject = {};
    const unparsedProduct = $('#product').val();
    if(!unparsedProduct) {
        for (var i = 1; i < 6; i++) {
            jsonObject[i] = { path: null, blob: null, remove: false };
        }
    } else {
        var product = JSON.parse(unparsedProduct);
        for (var i = 1; i < 6; i++) {
            jsonObject[i] = { path: product['image' + i + 'Path'], blob: null, remove: false };
        }
    }
    
    console.log(jsonObject)
    return jsonObject;
}

function handleRemoveClick(event) {
    const container = document.getElementById('container');
    const removeButton = event.target;
    const inputRow = removeButton.parentNode.parentNode;
    console.log(removeButton);
    console.log(inputRow);
    // Remove the input row from the container
    container.removeChild(inputRow);
    rowCount--;

    const rows = container.getElementsByClassName('row');

    const rowsCount = rows.length;
    const lastRow = rows[rowsCount - 1];
    console.log(container.getElementsByClassName('row'))
    console.log(lastRow)
    const plusButtonDiv = lastRow.getElementsByClassName('col-sm-1')[rowCount == 1 ? 0 : 1];

    if (plusButtonDiv.childElementCount === 0) {
        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.classList.add('add-btn');
        plusButton.classList.add('btn');
        plusButton.classList.add('btn-primary');
        plusButton.type = 'button';

        plusButton.addEventListener('click', handleAddClick);
        plusButtonDiv.append(plusButton);
    }
}

function handleAddClick(event) {
    if (rowCount == 6)
        return;
    const container = document.getElementById('container');
    const addButton = event.target;

    // Create a new input row
    const newInputRow = document.createElement('div');
    newInputRow.classList.add('row');
    newInputRow.classList.add('mb-3');

    const leftRow = document.createElement('div');
    leftRow.classList.add('col-sm-10');

    const rightRow = document.createElement('div');
    rightRow.classList.add('col-sm-1');

    const rightRow2 = document.createElement('div');
    rightRow2.classList.add('col-sm-1');

    // Create a new input field
    const newInput = document.createElement('input');
    newInput.classList.add('form-control');
    newInput.type = 'text';
    newInput.name = 'input[]';
    // newInput.required = true;


    // Create a plus button for the new input row
    const removeButton = document.createElement('button');
    removeButton.textContent = '-';
    removeButton.classList.add('remove-btn');
    removeButton.classList.add('btn');
    removeButton.classList.add('btn-danger');
    removeButton.type = 'button';
    removeButton.addEventListener('click', handleRemoveClick);
    // Create a plus button for the new input row
    const plusButton = document.createElement('button');
    plusButton.textContent = '+';
    plusButton.classList.add('add-btn');
    plusButton.classList.add('btn');
    plusButton.classList.add('btn-primary');
    plusButton.type = 'button';

    // Append the new input and plus button to the new input row
    leftRow.appendChild(newInput);

    const pError = document.createElement('p');
    pError.classList.add('small');
    pError.classList.add('text-danger');
    leftRow.appendChild(pError);

    newInputRow.appendChild(leftRow);

    rightRow.appendChild(removeButton);
    rightRow2.appendChild(plusButton);
    newInputRow.appendChild(rightRow);
    newInputRow.appendChild(rightRow2);

    // Append the new input row to the container
    container.append(newInputRow);

    // Change the original add button to a remove button
    // addButton.textContent = 'Remove';
    // addButton.classList.remove('add-btn');
    // addButton.classList.add('remove-btn');
    // addButton.classList.add('btn-danger');
    // addButton.type = 'button';

    // // Attach the remove button click event
    // addButton.removeEventListener('click', handleAddClick);
    // 

    addButton.parentNode.removeChild(addButton)

    // Attach the add button click event to the new input row
    plusButton.addEventListener('click', handleAddClick);
    rowCount++;

}

function arrayFileMap() {
    var array = [];
    fileMap.forEach((value, key) => {
        if (value != null) {
            var item = { picture: key, blob: value };
            array.push(item);
        }
    });

    return array;
}


function clearInputValidaton(id) {
    const element = document.getElementById(id);
    element.classList.remove('is-invalid');
}

function clearErrorMessages() {
    $('.text-danger').text("");

    clearInputValidaton('name');
    clearInputValidaton('description');
    clearInputValidaton('subDescriptionTitle');
    clearInputValidaton('subDescription');
    const pictureLabel = document.getElementById('picture1Label');
    pictureLabel.classList.remove('picture-error');
}

function saveProductInformation() {
    // $('#nameError').text("");
    
    // productNameElement.classList.remove('is-invalid');
    clearErrorMessages();
    const productNameElement = document.getElementById('name');
    const productName = productNameElement.value;
    if(productName === '') {
        productNameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productNameElement.classList.add('is-invalid');
        return $('#nameError').text("'Product Name' must be set to save.");
    }

    // persist information as is
    // refresh the page
    // and pass message

    const productTypeId = $('#productType').val();
    const description = $('#description').val();
    const subDescription = $('#subDescription').val();
    const subDescriptionTitle = $('#subDescriptionTitle').val();

    var bulletPointsElement = document.getElementsByName('input[]');
    var bulletPoints = [];

    for (var i = 0; i < bulletPointsElement.length; i++) {
        bulletPoints.push(bulletPointsElement[i].value);
    }

    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';


    for (key in fileJsonObject) {
        const item = fileJsonObject[key];
        data.append(key + 'Blob', item.blob);
        data.append(key + 'Remove', item.remove);
        data.append(key + 'Path', item.path);
    }

    data.append('productName', productName);
    data.append('productTypeId', productTypeId);
    data.append('description', description);
    data.append('subDescription', subDescription);
    data.append('subDescriptionTitle', subDescriptionTitle);
    data.append('bulletPoints', bulletPoints);
    data.append('productId', $('#productId').val());

    request.addEventListener('load', function (response) {
        console.log(response)
        const error = response.currentTarget.response.error;
        if(error) {
            
            const productNameElement = document.getElementById('name');
            productNameElement.classList.remove('is-invalid');
            
            productNameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            productNameElement.classList.add('is-invalid');
            return $('#nameError').text("'Product Name' must be set to save.");
        }
        const id = response.currentTarget.response.id;
        return window.location = `/admin_dashboard/product/${id}/page1`;
    });

    request.open('post', '/admin_dashboard/product/page1/save');
    request.send(data);
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


function removePicture(event) {
    const button = event.currentTarget;
    console.log(event.target)
    const label = button.parentNode.getElementsByClassName('label')[0];
    const container = label.parentNode;
    const input = container.getElementsByClassName('picture')[0];
    console.log(label)
    input.value = null;
    var position = Number((input.id).replace('picture', ''));
    fileJsonObject[position] = { path: fileJsonObject[position].path, blob: null, remove: true };
    var newEvent = new Event('change');

    // Dispatch the event on the file input element
    input.dispatchEvent(newEvent);
    // resetLabel(input);
    // remove file
    // remove x button
    // remove picture
    // const input = button.parentNode.getElementsByClassName('picture')[0];
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
        // fileMap.set(position, blob);
        console.log(fileJsonObject)
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

function resetLabel(input) {
    // todo need a map of pictures
    const labelElement = input.parentNode.getElementsByClassName('label')[0];

    labelElement.classList.add('dropzone')
    labelElement.style.backgroundImage = "";
    labelElement.style.backgroundSize = '';
    labelElement.style.backgroundPosition = '';
    const button = labelElement.parentNode.getElementsByClassName('small-button')[0];
    button.parentNode.removeChild(button);
    var position = Number((input.id).replace('picture', ''));
    fileMap.set(position, null);
    var labelText = '';
    switch (input.id) {
        case 'picture1': labelText = 'Add Main Picture';
            break;
        case 'picture2': labelText = 'Add Picture 2';
            break;
        case 'picture3': labelText = 'Add Picture 3';
            break;
        case 'picture4': labelText = 'Add Picture 4';
            break;
        case 'picture5': labelText = 'Add Picture 5';
            break;
    }
    labelElement.textContent = labelText;
}

function cancelCrop() {
    basic.destroy();
    $('#uploadedImageForCrop').empty();
    $('#overlay').attr('style','display:none');
}
function getRowCount() {
    const unparsedProduct = $('#product').val();
    if(!unparsedProduct)
        return 1;
    const product = JSON.parse(unparsedProduct);

    var count = 0;
    for (var i = 0; i < 6; i++) {
        const point = product['descriptionPoint' + (i + 1)];
        if (point != null)
            count++
    };

    return count;
}

function handleElementErrors(id, label) {
    const element = document.getElementById(id);
    const elementValue = element.value;
    if(elementValue === '') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('is-invalid');
        $(`#${id}Error`).text(`'${label}' must be set to continue.`);
        return true;
    }

    return false;
}
// if path is null and blob is null means nothing has been set

function handlePictureError() {
    const picture1 = fileJsonObject[1];
    if ((picture1.blob == null && picture1.path == null) || picture1.remove == true) {
        $('#picture1Error').text('Make sure the main picture has been set to continue.');
        const pictureLabel = document.getElementById('picture1Label');
        pictureLabel.classList.add('picture-error');
        pictureLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true
    }

    return false;
}

function handleDescriptionBulletPointErrors() {

    let isError = false;
    var bulletPointsElements = document.getElementsByName('input[]');
    console.log(bulletPointsElements)
    for (var i = 0; i < bulletPointsElements.length; i++) {
        const bulletPointsElement = bulletPointsElements[i];
        
        if(bulletPointsElement.value === '') { 

            bulletPointsElement.classList.add('is-invalid');
            bulletPointsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const parent = bulletPointsElement.parentNode;
            const pErrors = parent.getElementsByClassName('text-danger');
            const pError = pErrors[0];
            pError.append("'Description Bullet Point' must be set to continue.");
            isError = true;
        } else {
            bulletPointsElement.classList.remove('is-invalid');
        }
    }

    return isError;
}

function continueProductInformation() {

    clearErrorMessages();
    let errorCount = 0;
    if(handleElementErrors('name', 'Product Name')) {
        errorCount++;
    }
        
    if(handleElementErrors('description', 'Main Product Description')) {
        errorCount++;
    }

    if(handleElementErrors('subDescriptionTitle', 'Sub Product Description Title')) {
        errorCount++;
    }
    
    if(handleElementErrors('subDescription', 'Sub Product Description')) {
        errorCount++;
    }

    if(handlePictureError()) {
        errorCount++;
    }

    if(handleDescriptionBulletPointErrors()) {
        errorCount++;
    }

    if(errorCount > 0) {
        return;
    }

    const productName = $('#name').val();
    const productTypeId = $('#productType').val();
    const description = $('#description').val();
    const subDescription = $('#subDescription').val();
    const subDescriptionTitle = $('#subDescriptionTitle').val();

    var bulletPointsElement = document.getElementsByName('input[]');
    var bulletPoints = [];

    for (var i = 0; i < bulletPointsElement.length; i++) {
        bulletPoints.push(bulletPointsElement[i].value);
    }

    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';


    for (key in fileJsonObject) {
        const item = fileJsonObject[key];
        data.append(key + 'Blob', item.blob);
        data.append(key + 'Remove', item.remove);
        data.append(key + 'Path', item.path);
    }

    data.append('productName', productName);
    data.append('productTypeId', productTypeId);
    data.append('description', description);
    data.append('subDescription', subDescription);
    data.append('subDescriptionTitle', subDescriptionTitle);
    data.append('bulletPoints', bulletPoints);
    data.append('productId', $('#productId').val());

    request.addEventListener('load', function (response) {
       if(request.status === 400) {
        const errors = response.currentTarget.response.errors;
        
        console.log(errors);
        return;
        
       }
        
        const id = response.currentTarget.response.id;
        return window.location = `/admin_dashboard/product/${id}/page2`;
    });

    request.open('post', '/admin_dashboard/product/page1/continue');
    request.send(data);
}

$(function () {

    const addButton = document.querySelector('.add-btn');
    addButton.addEventListener('click', handleAddClick);
    rowCount = getRowCount();
    $('.picture').on('change', setupCropWindow);
    $('#confirmCrop').on('click', confirmCrop);
    $('#cancelCrop').on('click', cancelCrop);
    $('.description-point').on('click', handleRemoveClick);
    $('#save').on('click', saveProductInformation);
    $('#continue').on('click', continueProductInformation);
    $('.small-button').on('click', removePicture);
    // fileJsonObject = initialiseFileJsonObject();
})