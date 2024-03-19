var deliveryRowCount = 1;
var selectedDeliveryIds = [];

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

function setUpDeliveryPrice(input) {

    input.addEventListener('input', function () {
        validateIsNumber(this);
    });
    input.addEventListener('change', function () {
        validateDecimal(this);
    });
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

                addButton.textContent = '-';
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

function continueToPage6(e) { 
    const form = document.getElementById('form');
    const productId = $('#productId').val();
    if (form.checkValidity()) {
        e.preventDefault();

        const deliveryOptions = createSelectedDeliveryOptionsList();
        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('deliveryOptions', JSON.stringify(deliveryOptions));

        request.addEventListener('load', function (response) {

            if(request.status == 400) {
                const error = response.currentTarget.response.error;
                return;
            }
            
        
            return window.location = `/product/${productId}/validate`;


            // var job = data.currentTarget.response;

            // jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productItemNumber: productItemNumber, productNumber: job.productNumber, productVariantId: job.productVariantId};
        });

        request.open('post', `/product/${productId}/save-delivery-options`);
        request.send(data);
    }
}

// Attach the add button click event to the initial input row

function setupDeliveryIds() {
    const productId = $('#productId').val();
    $.ajax({
        type: 'get',
        url: `/product/${productId}/get-product-deliveries`,
        success: function(productDeliveries) {
            productDeliveries.forEach(delivery => {
                selectedDeliveryIds.push(delivery.deliveryTypeFk);
            })
        }
    })
}


$(function () {

   
    const addDeliveryButton = document.querySelector('.add-delivery-btn');
    addDeliveryButton.addEventListener('click', handleAddDeliveryClick);

    const deliveryPriceInput = this.documentElement.getElementsByClassName('delivery-price')[0];
    setUpDeliveryPrice(deliveryPriceInput);
   
    $('.delivery-select').on('change', updateAllDeliverySelects);
    $('.remove-delivery-btn').on('click', handleRemoveDeliveryClick);
    setupDeliveryIds();
    $('#form').on('submit', continueToPage6);

})