var fileJsonObject;
var rowCount;
var deliveryRowCount;
var selectedDeliveryIds = [];
var priceMatrixMap;

function initialiseFileJosnObject() {
    var jsonObject = {};
    var product = JSON.parse($('#product').val());
    for (var i = 1; i < 6; i++) {
        jsonObject[i] = { path: product['image' + i + 'Path'], blob: null, remove: false };
    }
    console.log(jsonObject)
    return jsonObject;
}

function createPriceMatrix() {

    $('#price-container').empty();

    var options = document.querySelectorAll("select[name='options[]']");//.filter(o => o.selected);
    var selectedOptions = [];
    var selectedOptionsOptionTypes = new Set();
    options.forEach(option => {

        selectedOptions.push(option.selectedOptions);
    });
    //todo another condition check all optiontypes have selectd ioptions
    // console.log(selectedOptions)
    if (selectedOptions.length == 0)
        return;

    const map = new Map();

    selectedOptions.forEach(selectedOption => {
        selectedOptionsOptionTypes.add(selectedOption[0].getAttribute('data-optiontypeid'));

        var optionType = selectedOption[0].getAttribute('data-optiontype');

        selectedOption.forEach(op => {
            var option = { option: op.text, id: op.value }
            if (map.has(optionType)) {
                var listOfOptions = map.get(optionType);
                listOfOptions.push(option);
                map.set(optionType, listOfOptions);
            } else {
                map.set(optionType, [option]);
            }
        })

    })

    var optionTypes = document.querySelectorAll("select[name='select[]']");
    var selectedOptionTypes = [];
    optionTypes.forEach(optionType => {

        selectedOptionTypes.push(optionType.selectedOptions);
    })

    if (selectedOptionsOptionTypes.size != selectedOptionTypes.length)
        return;

    const columns = [];


    for (var j = 0; j < selectedOptionTypes.length; j++) {
        var selectedOptionType = selectedOptionTypes[j][0];
        var selectedOptionTypeText = selectedOptionType.text;

        columns.push({ columnName: selectedOptionTypeText, id: selectedOptionType.value, type: 'OptionType' });

    }

    var quantities = document.querySelectorAll("select[id='quantities']")[0].selectedOptions;
    for (var k = 0; k < quantities.length; k++) {
        var quantity = quantities[k];
        columns.push({ columnName: quantity.text, id: quantity.value, type: 'Quantity' });
    }

    const table = document.createElement('table');
    table.id = 'priceMatrixTable';
    table.classList.add('table');
    table.classList.add('table-striped');
    const thead = document.createElement('thead');
    thead.classList.add('text-center')

    columns.forEach(column => {

        const th = document.createElement('th');
        th.append(column.columnName);
        thead.append(th);

    });

    table.append(thead);
    var lists = []
    map.forEach((value, key) => {
        lists.push(value);
    });

    const combinations = generateCombinations(lists);

    populateTable(table, combinations, quantities);
    $('#price-container').append(table);
}

function generateCombinations(lists) {
    // Base case: If there are no lists, return an empty combination
    if (lists.length === 0) {
        return [[]];
    }

    // Get the first list from the array
    const currentList = lists[0];

    // Get the remaining lists
    const remainingLists = lists.slice(1);

    // Generate combinations for the remaining lists
    const remainingCombinations = generateCombinations(remainingLists);

    // Generate combinations for the current list
    const combinations = [];
    for (let option of currentList) {
        for (let combination of remainingCombinations) {
            // Combine the current option with each combination from the remaining lists
            const newCombination = [option, ...combination];

            // Add the new combination to the combinations array
            combinations.push(newCombination);
        }
    }

    return combinations;
}
function populateTable(table, combinations, quantities) {

    const body = document.createElement('tbody');

    combinations.forEach(combination => {

        const row = document.createElement('tr');

        combination.forEach(item => {

            const cell = document.createElement('td');
            cell.append(item.option);
            cell.setAttribute('data-optionid', item.id);

            row.append(cell);
        });

        const key = getKeyFromMap(priceMatrixMap, combination.map(c => Number(c.id)));
        quantities.forEach(quantity => {
            const cell = document.createElement('td');

            const input = document.createElement('input');
            input.classList.add('form-control');
            input.classList.add('quantity');
            input.setAttribute('data-quantityid', quantity.value);
            input.type = 'text';
            input.required = true;
            if(key != null) {
                const quantityMap = getFromMap(priceMatrixMap, key);
                console.log(quantityMap)
                console.log(quantity.text)
                const price = quantityMap.get(Number(quantity.text));
                console.log(price)
                if(price)
                    input.value = price
            }
            // input.step = '0.01';
            // input.min = '0';
            input.addEventListener('input', function () {
                validateIsNumber(this);
            });
            input.addEventListener('change', function () {
                validateDecimal(this);
            });

            cell.append(input);
            row.append(cell);
        });

        body.append(row);
    });

    table.append(body);
    return table;
}

function validateDecimal(input) {
    const value = input.value;
    // Parse the input value as a floating-point number
    const number = parseFloat(value);

    if (isNaN(number)) {
        // Invalid input, set value to empty string
        input.value = '';
    } else {
        // Round the number to two decimal places
        const roundedNumber = number.toFixed(2);
        // console.log(roundedNumber)
        // Update the input value with the rounded number
        input.value = roundedNumber;
    }
}

function validateIsNumber(input) {
    const value = input.value;

    const regex = /^\d*\.?\d{0,2}$/;

    if (!regex.test(value)) {
        // Invalid input, clear the value or display an error message
        input.value = '';
        // Alternatively, you can display an error message to the user
        // and prevent form submission until a valid value is entered.
    }
}

function handleAddClick(event) {
    if (rowCount == 6)
        return;
    const container = document.getElementById('container');
    const addButton = event.target;
    const inputRow = addButton.parentNode;

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
    newInput.required = true;

    // Create a plus button for the new input row
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
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
    newInputRow.appendChild(leftRow);

    rightRow.appendChild(removeButton);
    rightRow2.appendChild(plusButton);
    newInputRow.appendChild(rightRow);
    newInputRow.appendChild(rightRow2);

    // Append the new input row to the container
    container.append(newInputRow);

    // // Change the original add button to a remove button
    // addButton.textContent = 'Remove';
    // addButton.classList.remove('add-btn');
    // addButton.classList.add('remove-btn');
    // addButton.classList.add('btn-danger');
    // addButton.type = 'button';

    // // Attach the remove button click event
    // addButton.removeEventListener('click', handleAddClick);
    // addButton.addEventListener('click', handleRemoveClick);

    addButton.parentNode.removeChild(addButton)

    // Attach the add button click event to the new input row
    plusButton.addEventListener('click', handleAddClick);
    rowCount++;

}

function handleRemoveClick(event) {
    const container = document.getElementById('container');
    const removeButton = event.target;
    const inputRow = removeButton.parentNode.parentNode;
    // console.log(removeButton);
    // console.log(inputRow);
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

function handleAddSelectClick(event) {

    const container = document.getElementById('option-container');
    const addButton = event.target;
    const inputRow = addButton.parentNode;

    const errorMessages = inputRow.parentNode.getElementsByClassName('text-danger');
    if (errorMessages.length > 0) {
        for (var i = 0; i < errorMessages.length; i++) {
            errorMessages[i].remove();
        }
    }

    var selectedOptionText = inputRow.parentNode.getElementsByClassName('selectedOptions')[0];
    if (selectedOptionText.value == '') {
        const error = document.createElement('p');
        error.classList.add('text-danger');
        error.append('Please select options before creating a new row');
        console.log()
        inputRow.parentNode.append(error);
        return;
    }

    var selectsArray = $('select[name="select[]"]').serializeArray().map(function (item) {
        return item.value;
    });

    var optionTypes = JSON.parse($('#optionTypes').val());
    optionTypes = optionTypes.filter(o => !selectsArray.includes((o.id).toString()));

    if (optionTypes.length == 0)
        return;

    // Create a new input row
    const newInputRow = document.createElement('div');
    newInputRow.classList.add('row');
    newInputRow.classList.add('mb-3');

    const column1 = document.createElement('div');
    column1.classList.add('col-sm-5');

    const column2 = document.createElement('div');
    column2.classList.add('col-sm-5');

    const column3 = document.createElement('div');
    column3.classList.add('col-sm-2');

    const label1 = document.createElement('label');
    label1.classList.add('form-label');
    label1.append('Option Type')

    // Create a new input field
    const newSelect = document.createElement('select');
    newSelect.classList.add('form-control');
    newSelect.classList.add('optionTypes');
    newSelect.name = 'select[]';
    newSelect.required = true;

    const option = document.createElement('option');
    option.value = 0;
    newSelect.append(option);

    for (var i = 0; i < optionTypes.length; i++) {
        const optionType = optionTypes[i];
        const option = document.createElement('option');
        option.value = optionType.id;
        option.append(optionType.optionType);
        newSelect.append(option);
    }

    const label2 = document.createElement('label');
    label2.classList.add('form-label');
    label2.append('Options')
    const inputOptions = document.createElement('input');
    inputOptions.classList.add('selectedOptions');
    inputOptions.classList.add('form-control');
    inputOptions.classList.add('mb-2');
    inputOptions.disabled = true;

    const newOptions = document.createElement('select');
    newOptions.classList.add('form-control');
    newOptions.classList.add('options');
    newOptions.name = 'options[]';
    newOptions.required = true;
    newOptions.multiple = true;

    const label3 = document.createElement('label');
    label3.classList.add('form-label');
    label3.classList.add('text-white');
    label3.append('Options')

    // Create a plus button for the new input row
    const plusButton = document.createElement('button');
    plusButton.textContent = '+';
    plusButton.classList.add('add-btn-select');
    plusButton.classList.add('btn');
    plusButton.classList.add('btn-primary');

    // // Append the new input and plus button to the new input row
    column1.append(label1);
    column1.appendChild(newSelect);
    newInputRow.appendChild(column1);

    column2.append(label2);
    column2.append(inputOptions);
    column2.append(newOptions);
    newInputRow.appendChild(column2);

    column3.append(label3);
    column3.appendChild(document.createElement('br'));
    column3.appendChild(plusButton);
    newInputRow.appendChild(column3);

    // // Append the new input row to the container
    container.insertBefore(newInputRow, inputRow.nextSibling);

    // // Change the original add button to a remove button
    addButton.textContent = 'Remove';
    addButton.classList.remove('add-btn-select');
    addButton.classList.add('remove-btn-select');
    addButton.classList.add('btn-danger');
    addButton.type = 'button'

    // // Attach the remove button click event
    addButton.removeEventListener('click', handleAddSelectClick);
    addButton.addEventListener('click', handleRemoveSelectClick);

    // // Attach the add button click event to the new input row
    plusButton.addEventListener('click', handleAddSelectClick);
    // rowCount++;
    $('.optionTypes').on('change', getOptions);
    $('.options').on('click', selectedOptions);
    createPriceMatrix();
}

function setupMatrix() {
    const elements = document.getElementsByClassName('quantity');
    elements.forEach(element => {
        // console.log(element)
        element.addEventListener('input', function () {
            validateIsNumber(this);
        });
        element.addEventListener('change', function () {
            validateDecimal(this)
        });
    })
}

function selectedOptions(e) {

    var selectedOptions = e.currentTarget.selectedOptions;
    var text = '';
    for (var i = 0; i < selectedOptions.length; i++) {
        var selectedOption = selectedOptions[i];
        text = text + selectedOption.text + ', ';
    }

    text = text.substring(0, text.length - 2);

    var selectedOptionsInput = (e.currentTarget.parentNode).getElementsByClassName('selectedOptions');
    selectedOptionsInput[0].value = text;

    var quantities = document.querySelectorAll("select[id='quantities']")[0].selectedOptions;
    if (quantities.length > 0)
        createPriceMatrix();

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
    else if (file[0].size > 10240000) {
        resetLabel(input);

        $('#' + input.id + 'Error').text('The picture must not exceed size of 10MB');
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
function setupRemovePictureButtons() {

    const buttons = document.getElementsByClassName('small-button');
    console.log(buttons)
    buttons.forEach(button => {

        button.addEventListener('click', removePicture);
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

        default: labelText = "Add Picture";
            break;
    }
    labelElement.textContent = labelText;
}

function picture1Error() {
    $('#picture1Error').text('');

    const picture1 = fileJsonObject[1];
    if (picture1.remove == true) {
        $('#picture1Error').text('Make sure the main picture has been set');
        return true
    }

    return false;
}

function createSelectedDeliveryOptionsList() {

    var results = [];
    const selects = document.getElementsByName('delivery[]');

    selects.forEach(select => {

        const deliveryId = select.selectedOptions[0].value;
        const deliverySection = select.parentNode.parentNode;

        const price = deliverySection.getElementsByClassName('delivery-price')[0].value;
        results.push({ deliveryId: deliveryId, price: price });
    });

    return results;
}

function editProduct(e) {

    const form = document.getElementById('form');
    if (form.checkValidity()) {
        e.preventDefault();
        console.log('reece')

        // do additional check
        // files, 
        if (picture1Error()) {
            return;
        }

        const table = document.getElementById('priceMatrixTable');
        const tbody = table.getElementsByTagName("tbody")[0];
        const rows = tbody.getElementsByTagName("tr");

        const rowJson = [];
        rows.forEach(row => {
            var optionIdGroup = []
            var quantityGroup = [];
            row.cells.forEach(cell => {

                const optionId = cell.getAttribute('data-optionid');
                if (optionId != undefined) {
                    optionIdGroup.push(optionId);
                }

                const inputs = cell.getElementsByClassName('quantity');
                if (inputs.length > 0) {
                    const input = inputs[0];
                    const quantityId = input.getAttribute('data-quantityid');
                    const priceMatrixRowQuantityPriceId = input.getAttribute('data-priceMatrixRowQuantityPriceId');
                    quantityGroup.push({ id: quantityId, price: input.value, priceMatrixRowQuantityPriceId: priceMatrixRowQuantityPriceId });
                }

            });
            rowJson.push({ optionIdGroup: optionIdGroup, quantityGroup: quantityGroup });
        })


        // const filesAsArray = arrayFileMap();
        const rowJsonStringified = JSON.stringify(rowJson);
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

        var options = [];
        var optionsList = document.getElementsByName('options[]');

        optionsList.forEach(selectedOptions => {

            selectedOptions.forEach(selectedOption => {
                if (selectedOption.selected)
                    options.push(selectedOption.value);
            })
        })

        const quantities = $('#quantities').val();

        var statusList = document.getElementsByName('statusOptions');
        var deleteFl = false;

        for (var i = 0; i < statusList.length; i++) {
            if (statusList[i].value == 'deactive' && statusList[i].checked == true)
                deleteFl = true;
        }

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';
        // filesAsArray.forEach(file => {

        //     data.append(file.picture, file.blob);

        // })

        for (key in fileJsonObject) {
            const item = fileJsonObject[key];
            data.append(key + 'Blob', item.blob);
            data.append(key + 'Remove', item.remove);
        }

        const deliveryOptions = createSelectedDeliveryOptionsList();

        data.append('deliveryOptions', JSON.stringify(deliveryOptions));
        data.append('rows', rowJsonStringified);
        data.append('productName', productName);
        data.append('productTypeId', productTypeId);
        data.append('description', description);
        data.append('subDescription', subDescription);
        data.append('subDescriptionTitle', subDescriptionTitle);
        data.append('bulletPoints', bulletPoints);
        data.append('options', options);
        data.append('quantities', quantities);
        data.append('deleteFl', deleteFl);
        data.append('productId', $('#productId').val())

        request.addEventListener('load', function (response) {

            return window.location = '/admin_dashboard/product/' + $('#productId').val();


            // var job = data.currentTarget.response;

            // jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productItemNumber: productItemNumber, productNumber: job.productNumber, productVariantId: job.productVariantId};
        });

        request.open('post', '/edit_product');
        request.send(data);

    } else {
        console.log('invalid')
        picture1Error();
    }
}

function getRowCount() {
    const product = JSON.parse($('#product').val());
    var count = 0;
    for (var i = 0; i < 6; i++) {
        const point = product['descriptionPoint' + (i + 1)];
        if (point != null)
            count++
    };

    return count;
}

function handleAddDeliveryClick(event) {
    if (deliveryRowCount == 6)
        return;

    const deliveryOptionsElement = event.target.parentNode.parentNode;
    const deliveryPriceElement = deliveryOptionsElement.getElementsByClassName('delivery-price')[0];
    if (deliveryPriceElement.value == '')
        return;

    $.ajax({
        type: 'get',
        url: '/get_delivery_types',
        success: function (response, xhr, status) {

            if (status.status == 200) {

                const previousSelectElement = deliveryOptionsElement.getElementsByClassName('delivery-select')[0];
                selectedDeliveryIds.push(Number(previousSelectElement.selectedOptions[0].value));
                const deliveryContainer = document.getElementById('delivery-container');
                const addButton = event.target;
                const row = document.createElement('div');
                row.classList.add('row');
                row.classList.add('mb-3');

                const deliveryOptionColumn = document.createElement('div');
                deliveryOptionColumn.classList.add('col-sm-5');

                const deliveryOptionColumnLabel = document.createElement('label');
                deliveryOptionColumnLabel.classList.add('form-label');

                const selectDeliveryOption = document.createElement('select');
                selectDeliveryOption.classList.add('form-control');
                selectDeliveryOption.classList.add('delivery-select');
                selectDeliveryOption.type = 'text';
                selectDeliveryOption.required = true;
                selectDeliveryOption.name = 'delivery[]';
                console.log(selectedDeliveryIds)
                const deliveryTypes = response.deliveryTypes.filter(d => !selectedDeliveryIds.includes(d.id));
                console.log(deliveryTypes)
                deliveryTypes.forEach((deliveryType, index) => {

                    if (index == 0) {
                        selectDeliveryOption.setAttribute('data-current-deliverytypeid', deliveryType.id);
                        const selects = deliveryContainer.getElementsByClassName('delivery-select');
                        selects.forEach(s => {

                            if (s != selectDeliveryOption) {
                                s.options.forEach(o => {

                                    if (o.value == deliveryType.id) {
                                        s.removeChild(o)
                                    }
                                });
                            }
                        })
                    }
                    const option = document.createElement('option');
                    option.value = deliveryType.id;
                    option.text = deliveryType.name;
                    selectDeliveryOption.append(option);
                })

                selectDeliveryOption.addEventListener('change', updateAllDeliverySelects);

                deliveryOptionColumn.append(deliveryOptionColumnLabel);
                deliveryOptionColumn.append(selectDeliveryOption);

                row.append(deliveryOptionColumn);

                const deliveryOptionColumn2 = document.createElement('div');
                deliveryOptionColumn2.classList.add('col-sm-5');

                const deliveryPriceColumnLabel = document.createElement('label');
                deliveryPriceColumnLabel.classList.add('form-label');
                deliveryPriceColumnLabel.text = 'Delivery Price';

                const inputPriceElement = document.createElement('input');
                inputPriceElement.classList.add('form-control');
                inputPriceElement.classList.add('delivery-price');
                inputPriceElement.type = 'text';
                inputPriceElement.required = true;
                inputPriceElement.addEventListener('input', function () {
                    validateIsNumber(this);
                });
                inputPriceElement.addEventListener('change', function () {
                    validateDecimal(this);
                });

                deliveryOptionColumn2.appendChild(deliveryPriceColumnLabel);
                deliveryOptionColumn2.append(inputPriceElement);

                row.append(deliveryOptionColumn2);

                const deliveryOptionColumn3 = document.createElement('div');
                deliveryOptionColumn3.classList.add('col-sm-2');

                const invisibleLabel = document.createElement('label');
                invisibleLabel.classList.add('form-label');
                invisibleLabel.classList.add('text-white');
                invisibleLabel.text = 'D';

                const brElement = document.createElement('br');
                const button = document.createElement('button');
                button.classList.add('btn');
                button.classList.add('btn-primary');
                button.classList.add('add-delivery-btn');
                button.type = 'button';
                button.append('+');
                button.addEventListener('click', handleAddDeliveryClick);

                deliveryOptionColumn3.append(invisibleLabel);
                deliveryOptionColumn3.append(brElement);
                deliveryOptionColumn3.append(button);

                row.append(deliveryOptionColumn3);

                deliveryContainer.append(row);

                addButton.textContent = 'Remove';
                addButton.classList.remove('add-delivery-btn');
                addButton.classList.add('remove-delivery-btn');
                addButton.classList.add('btn-danger');
                addButton.type = 'button';
                // Attach the remove button click event
                addButton.removeEventListener('click', handleAddDeliveryClick);
                addButton.addEventListener('click', handleRemoveDeliveryClick);
                //continue
                deliveryRowCount++;
                // const changeEvent = new Event('change');
                // selectDeliveryOption.dispatchEvent(changeEvent)
            }
        }
    })
}

function handleRemoveDeliveryClick(event) {
    const container = document.getElementById('delivery-container');
    const removeButton = event.target;
    const inputRow = removeButton.parentNode.parentNode;


    const select = inputRow.getElementsByClassName('delivery-select')[0];
    const selectId = select.selectedOptions[0].value;
    selectedDeliveryIds = selectedDeliveryIds.filter(d => d != selectId.toString());
    // Remove the input row from the container
    container.removeChild(inputRow);
    deliveryRowCount--;

    $.ajax({
        type: 'get',
        url: '/get_delivery_types',
        success: function (response, xhr, status) {

            if (status.status == 200) {
                const deliveryTypes = response.deliveryTypes;

                const selects = document.getElementsByName('delivery[]');

                selects.forEach(select => {

                    const option = document.createElement('option');
                    option.value = selectId;
                    option.text = deliveryTypes.filter(d => d.id == selectId).map(o => o.name);

                    select.append(option);
                })
            }
        }

    })
}

function setupDeliveryIds() {

    const productDeliveries = JSON.parse($('#productDeliveries').val());
    productDeliveries.forEach(delivery => {
        selectedDeliveryIds.push(delivery.deliveryTypeFk);
    })
    return selectedDeliveryIds;
}

function updateAllDeliverySelects(e) {

    const select = e.currentTarget;
    const previousDeliveryTypeId = select.getAttribute('data-current-deliverytypeid');

    const newValue = select.selectedOptions[0].value;

    select.setAttribute('data-current-deliverytypeid', newValue);

    const deliveryContainer = select.parentNode.parentNode.parentNode;



    $.ajax({
        type: 'get',
        url: '/get_delivery_type',
        data: { id: previousDeliveryTypeId },
        success: function (response, xhr, status) {
            if (status.status == 200) {

                const deliveryType = response.deliveryType;
                const deliveryTypeName = deliveryType.name;
                const selects = deliveryContainer.getElementsByClassName('delivery-select');
                selects.forEach(s => {
                    if (s != select) {

                        s.options.forEach(o => {
                            if (o.value == newValue) {
                                s.removeChild(o);
                            };
                        });

                        const option = document.createElement('option');
                        option.value = previousDeliveryTypeId;
                        option.text = deliveryTypeName;

                        s.append(option);
                    }
                })
            }
        }
    })
}

$(function () {

    const addButton = document.querySelector('.add-btn');
    if(addButton) {
        addButton.addEventListener('click', handleAddClick);
    }
    

    // const addSelectButton = document.querySelector('.add-btn-select');
    // addSelectButton.addEventListener('click', handleAddSelectClick);
    // // // $('#createProduct').on('click', createProduct);

    // $('.optionTypes').on('change', getOptions);
    $('.options').on('click', selectedOptions);
    setupMatrix();
    $('#quantities').on('change', createPriceMatrix);
    fileJsonObject = initialiseFileJosnObject();

    $('.picture').on('change', setupCropWindow);
    $('#confirmCrop').on('click', confirmCrop);
    $('.small-button').on('click', removePicture);
    $('.description-point').on('click', handleRemoveClick);
    // setupRemovePictureButtons()
    rowCount = getRowCount();
    deliveryRowCount = $('#totalProductDelivery').val();
    $('#form').on('submit', editProduct);

    const addDeliveryButton = document.querySelector('.add-delivery-btn');
    addDeliveryButton.addEventListener('click', handleAddDeliveryClick);

    $('.remove-delivery-btn').on('click', handleRemoveDeliveryClick);

    selectedDeliveryIds = setupDeliveryIds();
    $('.delivery-select').on('change', updateAllDeliverySelects);

    populateMatrixMap();

})

function populateMatrixMap() {
    const matrixRows = JSON.parse($('#matrixRows').val());

    priceMatrixMap = new Map();
    matrixRows.forEach(row => {
        row.forEach(item => {
            const options = item.options.map(o => o.id);
            var quantityMap;
            const key = getKeyFromMap(priceMatrixMap, options);
            if (key == null) {
                quantityMap = new Map();
            } else {
                quantityMap = priceMatrixMap.get(key);
            }
            quantityMap.set(item.quantity, item.price);
            priceMatrixMap.set(key == null ? options : key, quantityMap);
        });
    });
}

function arraysAreEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }

    // Sort the arrays in ascending order
    const sortedArr1 = arr1.slice().sort((a, b) => a - b);
    const sortedArr2 = arr2.slice().sort((a, b) => a - b);

    // Compare the sorted arrays for equality
    for (let i = 0; i < sortedArr1.length; i++) {
        if (sortedArr1[i] !== sortedArr2[i]) {
            return false;
        }
    }

    return true;
}

function getFromMap(map, keyToCheck) {
    for (const [key, value] of map.entries()) {
        if (arraysAreEqual(key, keyToCheck)) {
            return value;
        }
    }
    return null; // Return null if the key doesn't exist
}

function getKeyFromMap(map, keyToCheck) {
    if (map.size == 0)
        return null;

    for (const [key, value] of map.entries()) {
        if (arraysAreEqual(key, keyToCheck)) {
            return key;
        }
    }
    return null; // Return null if the key doesn't exist
}
