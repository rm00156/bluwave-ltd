let quantities;
let finishingMatrices;
let rowCount = 1;
let actualRowCount = document.getElementsByClassName('optionTypes').length;
function handleMainOptionsRequired() {
    console.log(actualRowCount)
    if(actualRowCount === 1 && Number($('#mainOptionTypes').val()) === 0) {
        $('#mainOptions').prop('required', false);
        console.log(false)
    } else {
        $('#mainOptions').prop('required', true);
        console.log(true)
    }
}
function getOptions(e) {
    
    handleMainOptionsRequired();
    // when more than one option types
    // make first options requires
    var optionsElement = (e.currentTarget.parentNode.parentNode).getElementsByClassName('options');

    while (optionsElement[0].options.length > 0) {
        optionsElement[0].remove(0);
    }
    var selectedOption = e.currentTarget.selectedOptions[0];
    
    const orderNo = e.currentTarget.getAttribute('data-matrix-orderNo');
    var data = { optionTypeId: selectedOption.value };

    $.ajax({
        type: 'get',
        url: '/getOptionsForOptionType',
        data: data,
        success: function (response, xhr) {

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
            
            createFinishingMatrix(orderNo , [], [])

        }
    })
}

function selectedOptions(e) {

    var selectedOptions = e.currentTarget.selectedOptions;
    var text = '';
    for (var i = 0; i < selectedOptions.length; i++) {
        var option = selectedOptions[i];
        text = text + option.text + ', ';
    }

    text = text.substring(0, text.length - 2);
    const optionsNode = e.currentTarget.parentNode;
    const selectedOptionsInputs = (optionsNode).getElementsByClassName('selectedOptions');
    const selectedOptionsInput = selectedOptionsInputs[0];
    selectedOptionsInput.value = text;
    const orderNo = selectedOptionsInput.getAttribute('data-matrix-orderNo');
    // const selectedOptions = optionsNode.querySelectorAll('[name="options[]"]')[0].selectedOptions;

    const parentNode = optionsNode.parentNode;
    const selectedOptionTypes = parentNode.querySelectorAll('[name="select[]"]')[0].selectedOptions;

    if (quantities.length > 0)
        createFinishingMatrix(orderNo, selectedOptions, selectedOptionTypes);

}


function createFinishingMatrix(orderNo, selectedOptions, selectedOptionTypes) {
    $(`#finishing-container${orderNo}`).empty();

    // var options = document.querySelectorAll("select[name='options[]']");//.filter(o => o.selected);
    // var selectedOptions = [];
    var selectedOptionsOptionTypes = new Set();
    // options.forEach(option => {

    //     selectedOptions.push(option.selectedOptions);
    // });
    //todo another condition check all optiontypes have selectd ioptions
    if (selectedOptions.length == 0)
        return;

    const map = new Map();
    // selectedOptions.forEach(selectedOption => {
    // const selectedOption = selectedOptions[orderNo - 1];
    selectedOptionsOptionTypes.add(selectedOptions[0].getAttribute('data-optiontypeid'));

    var optionType = selectedOptions[0].getAttribute('data-optiontype');

    selectedOptions.forEach(op => {
        var option = { option: op.text, id: op.value }
        if (map.has(optionType)) {
            var listOfOptions = map.get(optionType);
            listOfOptions.push(option);
            map.set(optionType, listOfOptions);
        } else {
            map.set(optionType, [option]);
        }
    })

    // })

    // var optionTypes = document.querySelectorAll("select[name='select[]']");
    // var selectedOptionTypes = [];
    // let count = 1;
    // optionTypes.forEach(optionType => {
        
    //     selectedOptionTypes.push(optionType.selectedOptions);
    
    // })

    if (selectedOptionsOptionTypes.size != selectedOptionTypes.length)
        return;
       
    const columns = [];

    // for (var j = 0; j < selectedOptionTypes.length; j++) {
        var selectedOptionType = selectedOptionTypes[0];
        var selectedOptionTypeText = selectedOptionType.text;

        columns.push({ columnName: selectedOptionTypeText, id: selectedOptionType.value, type: 'OptionType' });

    // }

    // var quantities = document.querySelectorAll("select[id='quantities']")[0].selectedOptions;
    for (var k = 0; k < quantities.length; k++) {
        var quantity = quantities[k];
        columns.push({ columnName: quantity.quantity, id: quantity.id, type: 'Quantity' });
    }

    const table = document.createElement('table');
    table.id = `finishingMatrixTable${orderNo}`;
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

    populateTable(table, combinations, quantities, orderNo);
    $(`#finishing-container${orderNo}`).append(table);
}

function getQuantities() {
    const productId = $('#productId').val();
    $.ajax({
        type: 'get',
        url: `/product/${productId}/get_quantities`,
        success: function(data) {
            quantities = data;
        }
    })
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
function populateTable(table, combinations, quantities, orderNo) {

    const body = document.createElement('tbody');
    let finishingMatrixMap = finishingMatrices.get(Number(orderNo));

    if(finishingMatrixMap === undefined) {
        finishingMatrixMap = new Map();
    }
    combinations.forEach(combination => {

        const row = document.createElement('tr');

        combination.forEach(item => {

            const cell = document.createElement('td');
            cell.append(item.option);
            cell.setAttribute('data-optionid', item.id);

            row.append(cell);
        });

        const key = getKeyFromMap(finishingMatrixMap, combination.map(c => Number(c.id))[0]);
        quantities.forEach(quantity => {
            const cell = document.createElement('td');

            const input = document.createElement('input');
            input.classList.add('form-control');
            input.classList.add('quantity');
            input.setAttribute('data-quantityid', quantity.id);
            input.type = 'text';
            // input.required = true;
            input.style = 'width:100px';


            if(key != null) {
                const quantityMap = getFromMap(finishingMatrixMap, key);
                const price = quantityMap.get(Number(quantity.quantity));
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

function getFromMap(map, keyToCheck) {
    for (const [key, value] of map.entries()) {
        if (key === keyToCheck) {
            return value;
        }
    }
    return null; // Return null if the key doesn't exist
}

function getKeyFromMap(map, keyToCheck) {
    if (map.size == 0)
        return null;

    for (const [key, value] of map.entries()) {
        if (key === keyToCheck) {
            return key;
        }
    }
    return null; // Return null if the key doesn't exist
}

function populateFinishingMatrices() {

    const productId = $('#productId').val();
    $.ajax({
        type: 'get',
        url: `/product/${productId}/get_finishing_matrices`,
        success: function(data) {

            const matrices = data;
            let matrixCount = 1;
            finishingMatrices = new Map();
            matrices.forEach(matrix => {

                const matrixRows = matrix.rows;
                matrixRows.forEach(row => {
                    // row.forEach(item => {
                        const optionId = row.optionId;
                        var quantityMap;
                        let matrixMap = finishingMatrices.get(matrixCount);
                        if(matrixMap === undefined)
                            matrixMap = new Map();

                        const key = getKeyFromMap(matrixMap, optionId);
                        if (key == null) {
                            quantityMap = new Map();
                        } else {
                            quantityMap = matrixMap.get(key);
                        }
                        quantityMap.set(row.quantity, row.price);
                        matrixMap.set(key == null ? optionId : key, quantityMap);

                        finishingMatrices.set(matrixCount, matrixMap);
                    // });
                });
                matrixCount++;
             
            })

        }
    })
}


function handleAddSelectClick(event) {

    const container = document.getElementById('option-container');
    const addButton = event.target;
    rowCount++;
    const orderNo = rowCount;
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
    label2.disabled = true;
    const inputOptions = document.createElement('input');
    inputOptions.classList.add('selectedOptions');
    inputOptions.classList.add('form-control');
    inputOptions.classList.add('mb-2');
    inputOptions.classList.add('selectedOptions');
    inputOptions.setAttribute('data-matrix-orderNo', orderNo);
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
    removeButton.textContent = '-';
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
    plusButton.setAttribute('data-matrix-orderNo', orderNo);

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

    const finishingRow = document.createElement('div');
    finishingRow.classList.add('row');

    const div1 = document.createElement('div');
    div1.classList.add('mb-3');
    div1.classList.add('col-lg-12');
    div1.classList.add('mt-5');

    const finishingColumn = document.createElement('div');
    finishingColumn.classList.add('col-sm-12');

    const finishingMatrixLabel = document.createElement('label');
    finishingMatrixLabel.classList.add('form-label');
    finishingMatrixLabel.classList.add('mb-2');

    finishingMatrixLabel.append('Finishing Matrix');
    const finishingContainer = document.createElement('div');
    finishingContainer.id = `finishing-container${orderNo}`;

    finishingColumn.append(finishingMatrixLabel);
    finishingColumn.append(finishingContainer);

    div1.append(finishingColumn);
    finishingRow.append(div1);

    newInputRow.append(finishingRow);

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
    // createFinishingMatrix(orderNo);
    actualRowCount++;
}

function handleRemoveSelectClick(event) {
    const container = document.getElementById('option-container');
    const removeButton = event.target;

    const inputRow = removeButton.parentNode.parentNode;
    const rows = container.getElementsByClassName('row');

    const rowsCount = rows.length;
    const lastRow = rows[rowsCount - 4];
    const plusButtonDiv = lastRow.getElementsByClassName('col-sm-1')[rowsCount == 4 ? 0 : 1];

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
    actualRowCount--;
    handleMainOptionsRequired();
    // createPriceMatrix();
}

function saveFinishingAttributes(e) {


    const form = document.getElementById('form');
    if (form.checkValidity()) {
        e.preventDefault();
        const submitter = e.originalEvent.submitter.id
        const productId = $('#productId').val();
        
        let inputRequiredCount = 0;
        const matrices = [];
        const tables = document.getElementsByClassName('table');
        tables.forEach(table => { 

            // const table = document.getElementById('finishingMatrixTable');
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
                        const finishingMatrixRowQuantityPriceId = input.getAttribute('data-finishingMatrixRowQuantityPriceId');
                        input.classList.remove('is-invalid');
                        if(submitter === 'continue' && input.value === '') {
                            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            input.classList.add('is-invalid');
                            inputRequiredCount++;
                        }
                        quantityGroup.push({ id: quantityId, price: input.value, finishingMatrixRowQuantityPriceId: finishingMatrixRowQuantityPriceId });
                    }
    
                });
                rowJson.push({ optionId: optionIdGroup, quantityGroup: quantityGroup });
            });
            matrices.push(rowJson);
        })
        if(inputRequiredCount > 0)
            return;

        const matricesJsonStringified = JSON.stringify(matrices);
        // var options = [];
        // var optionsList = document.getElementsByName('options[]');

        // optionsList.forEach(selectedOptions => {

        //     selectedOptions.forEach(selectedOption => {
        //         if (selectedOption.selected)
        //             options.push(selectedOption.value);
        //     })
        // })
        
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('matrices', matricesJsonStringified);
        // data.append('options', options);

        request.addEventListener('load', function (response) {

            submitter === 'save' ? location.reload() : window.location = `/admin_dashboard/product/${productId}/page5`;
        });

        request.open('post', submitter === 'save' ? `/product/${productId}/save_finishing_attributes` : `/admin_dashboard/product/${productId}/page4/continue`);
        request.send(data);
    }
}

function setupMatrix() {
    const elements = document.getElementsByClassName('quantity');
    elements.forEach(element => {
        element.addEventListener('input', function () {
            validateIsNumber(this);
        });
        element.addEventListener('change', function () {
            validateDecimal(this)
        });
    })
}


$(function () {

    $('#form').on('submit', saveFinishingAttributes);
    // $('#cancelModal').on('click', cancelModal);
    setupMatrix();
    $('.options').on('click', selectedOptions);
    $('.optionTypes').on('change', getOptions);
    const addSelectButton = document.querySelector('.add-btn-select');
    addSelectButton.addEventListener('click', handleAddSelectClick);

    const removeSelectButton = document.querySelector('.remove-btn-select');
    if(removeSelectButton)
        removeSelectButton.addEventListener('click', handleRemoveSelectClick);
    getQuantities();
    populateFinishingMatrices();
    
})