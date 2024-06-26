var rowCount = 1;
var deliveryRowCount = 1;
var url;
var basic;
var fileMap = initialiseFileMap();
var selectedDeliveryIds = [];

function initialiseFileMap() {
    var map = new Map();
    map.set(1, null);
    map.set(2, null);
    map.set(3, null);
    map.set(4, null);
    map.set(5, null);
    return map;
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

function handleAddDeliveryClick(event) {
    if (deliveryRowCount == 6)
        return;

    const deliveryOptionsElement = event.target.parentNode.parentNode;
    const deliveryPriceElement = deliveryOptionsElement.getElementsByClassName('delivery-price')[0];
    if (deliveryPriceElement.value == '')
        return;

    $.ajax({
        type: 'get',
        url: '/get-delivery-types',
        success: function (response, xhr, status) {

            if (status.status == 200) {

                const previousSelectElement = deliveryOptionsElement.getElementsByClassName('delivery-select')[0];
                selectedDeliveryIds.push(previousSelectElement.selectedOptions[0].value);
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

                const deliveryTypes = response.deliveryTypes.filter(d => !selectedDeliveryIds.includes(d.id.toString()));

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

                deliveryOptionColumn2.append(deliveryPriceColumnLabel);
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
            }
        }
    })
}

// Function to handle the remove button click event
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
        url: '/get-delivery-types',
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


// Function to handle the remove button click event
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

function handleRemoveSelectClick(event) {
    const container = document.getElementById('option-container');
    const removeButton = event.target;
    const inputRow = removeButton.parentNode.parentNode;
    const rows = container.getElementsByClassName('row');

    const rowsCount = rows.length;
    const lastRow = rows[rowsCount - 2];
    console.log(lastRow)
    const plusButtonDiv = lastRow.getElementsByClassName('col-sm-1')[rowsCount == 2 ? 0 : 1];

    if (plusButtonDiv.childElementCount === 0) {
        const label = document.createElement('label');
        label.classList.add('form-label');
        label.classList.add('text-white');
        label.append('Options')
        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.classList.add('add-btn');
        plusButton.classList.add('btn');
        plusButton.classList.add('btn-primary');
        plusButton.type = 'button';

        plusButton.addEventListener('click', handleAddSelectClick);
        plusButtonDiv.append(label);
        plusButtonDiv.append(plusButton);
    }
    // Remove the input row from the container
    container.removeChild(inputRow);
    createPriceMatrix();
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
    column3.classList.add('col-sm-1');

    const column4 = document.createElement('div');
    column4.classList.add('col-sm-1');

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

    const label4 = document.createElement('label');
    label4.classList.add('form-label');
    label4.classList.add('text-white');
    label4.append('Options')

    // Create a plus button for the new input row
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.classList.add('remove-btn-select');
    removeButton.classList.add('btn');
    removeButton.classList.add('btn-danger');
    removeButton.type="button";

    // Create a plus button for the new input row
    const plusButton = document.createElement('button');
    plusButton.textContent = '+';
    plusButton.classList.add('add-btn-select');
    plusButton.classList.add('btn');
    plusButton.classList.add('btn-primary');
    plusButton.type="button";

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
    column3.appendChild(removeButton);
    newInputRow.appendChild(column3);

    column4.append(label4);
    column4.appendChild(document.createElement('br'));
    column4.appendChild(plusButton);
    newInputRow.appendChild(column4);

    // // Append the new input row to the container
    container.append(newInputRow);

    // // // Change the original add button to a remove button
    // addButton.textContent = 'Remove';
    // addButton.classList.remove('add-btn-select');
    // addButton.classList.add('remove-btn-select');
    // addButton.classList.add('btn-danger');
    // addButton.type = 'button'

    // // Attach the remove button click event
    removeButton.addEventListener('click', handleRemoveSelectClick);
    addButton.parentNode.innerHTML = '';
    // // Attach the add button click event to the new input row
    plusButton.addEventListener('click', handleAddSelectClick);
    // rowCount++;

    $('.optionTypes').on('change', getOptions);
    $('.options').on('click', selectedOptions);
    createPriceMatrix();
}

function picture1Error() {
    $('#picture1Error').text('');

    const picture1 = fileMap.get(1);
    if (picture1 == null) {
        $('#picture1Error').text('Make sure the main picture has been set');
        return true
    }

    return false;
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

function createProduct(e) {

    const form = document.getElementById('form');
    if (form.checkValidity()) {
        e.preventDefault();


        // do additional check
        // files, 
        if (picture1Error()) {
            return;
        }

        const table = document.getElementById('priceMatrixTable');
        const rows = table.rows;
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
                    quantityGroup.push({ id: quantityId, price: input.value });
                }

            });
            rowJson.push({ optionIdGroup: optionIdGroup, quantityGroup: quantityGroup });
        })


        const filesAsArray = arrayFileMap();
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
        filesAsArray.forEach(file => {
            data.append(file.picture, file.blob);
        });

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

        request.addEventListener('load', function (response) {

            return window.location = '/admin-dashboard/product/add_product';


            // var job = data.currentTarget.response;

            // jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productItemNumber: productItemNumber, productNumber: job.productNumber, productVariantId: job.productVariantId};
        });

        request.open('post', '/create-product');
        request.send(data);

    } else {
        console.log('invalid')
        picture1Error();
    }



}

function handleChangeSelect(e) {
    console.log(e);
    var selectsArray = $('select[name="select[]"]').serializeArray().map(function (item) {
        return item.value;
    });

    console.log()
}

function getOptions(e) {

    var optionsElement = (e.currentTarget.parentNode.parentNode).getElementsByClassName('options');
    while (optionsElement[0].options.length > 0) {
        optionsElement[0].remove(0);
    }
    var selectedOption = e.currentTarget.selectedOptions[0];

    var data = { optionTypeId: selectedOption.value };

    $.ajax({
        type: 'get',
        url: '/get-options-for-option-type',
        data: data,
        success: function (response, xhr) {
            if (xhr.status == 404) {
                window.location = '/admin-dashboard';
                console.log('error with getting options by option Type')
            } else {

                var options = response;
                for (var i = 0; i < options.length; i++) {
                    var option = options[i];
                    var newOption = document.createElement('option');
                    newOption.value = option.id;
                    newOption.setAttribute('data-optionTypeId', option.optionTypeFk);
                    newOption.setAttribute('data-optionType', selectedOption.text);
                    newOption.append(option.name);
                    newOption.selected = false;
                    optionsElement[0].append(newOption);
                }

                optionsElement[0].parentNode.getElementsByClassName('selectedOptions')[0].value = '';
                createPriceMatrix();
                // [0].text = '';
                // createPriceMatrix();

            }

        }
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

function createPriceMatrix() {

    $('#price-container').empty();

    var options = document.querySelectorAll("select[name='options[]']");//.filter(o => o.selected);
    var selectedOptions = [];
    var selectedOptionsOptionTypes = new Set();
    options.forEach(option => {

        selectedOptions.push(option.selectedOptions);
    });
    //todo another condition check all optiontypes have selectd ioptions

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
    // console.log(map)

    var optionTypes = document.querySelectorAll("select[name='select[]']");//.filter(o => o.selected);
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

        quantities.forEach(quantity => {
            const cell = document.createElement('td');

            const input = document.createElement('input');
            input.classList.add('form-control');
            input.classList.add('quantity');
            input.setAttribute('data-quantityid', quantity.value);
            input.type = 'text';
            input.required = true;
            input.style = 'width:100px';
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

function addPicture(event) {

    const input = event.currentTarget;
    const selectedFiles = input.files;

    $('#' + input.id + 'Error').text('');
    if (selectedFiles.length > 0) {
        $('#' + input.id + 'Error').text('File Selected');
    }
}

function removePicture(event) {
    const button = event.currentTarget;
    const label = button.parentNode;
    const container = label.parentNode;
    const input = container.getElementsByClassName('picture')[0];
    console.log(input)
    input.value = null;
    var event = new Event('change');

    // Dispatch the event on the file input element
    input.dispatchEvent(event);
    // resetLabel(input);
    // remove file
    // remove x button
    // remove picture
    // const input = button.parentNode.getElementsByClassName('picture')[0];
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
        fileMap.set(position, blob);
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

function setUpDeliveryPrice(input) {

    input.addEventListener('input', function () {
        validateIsNumber(this);
    });
    input.addEventListener('change', function () {
        validateDecimal(this);
    });
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

function updateAllDeliverySelects(e) {

    const select = e.currentTarget;
    const previousDeliveryTypeId = select.getAttribute('data-current-deliverytypeid');

    const newValue = select.selectedOptions[0].value;

    select.setAttribute('data-current-deliverytypeid', newValue);

    const deliveryContainer = select.parentNode.parentNode.parentNode;



    $.ajax({
        type: 'get',
        url: '/get-delivery-type',
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

function cancelCrop() {
    basic.destroy();
    $('#uploadedImageForCrop').empty();
    $('#overlay').attr('style','display:none');
}


function handleFinishingAttributesError() {
    const optionContainerDiv = document.getElementById('finishing_option_types');
    const options = optionContainerDiv.getElementsByClassName('options');
    if(options.length === 0) {
        return $('#finishingError').text("Please make sure all option types in 'Printing Attributes' are set.");
    }


        
}

function addFinishingOptionType(event) {
    // const addFinishingButton = document.getElementById('add-finishing-btn');
    // addFinishingButton.style = 'display:none';

    

    // check if the last printing options type are fully populated
    // and last finishing option type fully populated


    // get option-container
    // get all class options
    // essentially get the last one

    $('#finishingError').text("");
    if(!isValidToAddNewFinishingAttributes()) {
        // display error message

        return handleFinishingAttributesError(event);
    }
    
    // add finishing section

    const finishingOptionTypesDiv = document.getElementById('finishing_option_types');

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
    column3.classList.add('col-sm-1');

    const column4 = document.createElement('div');
    column4.classList.add('col-sm-1');

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

    const label4 = document.createElement('label');
    label4.classList.add('form-label');
    label4.classList.add('text-white');
    label4.append('Options')

    // Create a plus button for the new input row
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.classList.add('remove-btn-select');
    removeButton.classList.add('btn');
    removeButton.classList.add('btn-danger');
    removeButton.type="button";

    // Create a plus button for the new input row
    const plusButton = document.createElement('button');
    plusButton.textContent = '+';
    plusButton.classList.add('add-btn-select');
    plusButton.classList.add('btn');
    plusButton.classList.add('btn-primary');
    plusButton.type="button";

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
    column3.appendChild(removeButton);
    newInputRow.appendChild(column3);

    column4.append(label4);
    column4.appendChild(document.createElement('br'));
    column4.appendChild(plusButton);
    newInputRow.appendChild(column4);

    // // Append the new input row to the container
    finishingOptionTypesDiv.append(newInputRow);


    // // Attach the remove button click event
    // removeButton.addEventListener('click', handleRemoveSelectClick);
    // addButton.parentNode.innerHTML = '';
    // // Attach the add button click event to the new input row
    // plusButton.addEventListener('click', handleAddSelectClick);
    // rowCount++;

    $('.optionTypes').on('change', getOptions);
    $('.options').on('click', selectedOptions);

} 

function isValidToAddNewFinishingAttributes() {

    return isPrintingAttribuetesValidToAddNewFinishingAttributes() && isFinishingAttribuetesValidToAddNewFinishingAttributes();
}

function isPrintingAttribuetesValidToAddNewFinishingAttributes() {
    const optionContainerDiv = document.getElementById('option-container');
    const options = optionContainerDiv.getElementsByClassName('options');
    if(options.length == 0)
        return false;

    return isValidOptionsSelected(options, true);
    
}

function isFinishingAttribuetesValidToAddNewFinishingAttributes() {
    const optionContainerDiv = document.getElementById('finishing_option_types');
    const options = optionContainerDiv.getElementsByClassName('options');

    if(options.length == 0)
        return true;
    
    return isValidOptionsSelected(options, false);
}

function isValidOptionsSelected(options, isPrintingAttribute) {
    
    const lastOptionsList = options[options.length - 1];
    const lastOptions = lastOptionsList.options;
    console.log(lastOptions)
    if(lastOptions.length == 0) {
        return !isPrintingAttribute;
    }
    const selected = [];
    lastOptions.forEach(option => {
        if(option.selected) {
            selected.push(option);
        }
    });
    console.log(selected)
    return selected.length > 0;
}

// Attach the add button click event to the initial input row
$(function () {

    const addButton = document.querySelector('.add-btn');
    addButton.addEventListener('click', handleAddClick);

    const addSelectButton = document.querySelector('.add-btn-select');
    addSelectButton.addEventListener('click', handleAddSelectClick);

    const addDeliveryButton = document.querySelector('.add-delivery-btn');
    addDeliveryButton.addEventListener('click', handleAddDeliveryClick);

    const deliveryPriceInput = this.documentElement.getElementsByClassName('delivery-price')[0];
    setUpDeliveryPrice(deliveryPriceInput);
    $('#createProduct').on('click', createProduct);

    $('.optionTypes').on('change', getOptions);
    $('.options').on('click', selectedOptions);

    $('#quantities').on('change', createPriceMatrix);
    // $('.picture').on('change', addPicture);
    $('.picture').on('change', setupCropWindow);
    $('#confirmCrop').on('click', confirmCrop);
    $('#cancelCrop').on('click', cancelCrop);
    $('#form').on('submit', createProduct);

    $('.delivery-select').on('change', updateAllDeliverySelects);

    $('.add-finishing-btn').on('click', addFinishingOptionType);
})
