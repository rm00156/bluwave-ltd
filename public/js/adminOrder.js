$(function(){
    if($('#message').val() != undefined) {
        setTimeout(function() {
            $('#toast').removeClass('show');
        }, 5000);
    }

    $.ajax({
        type: 'get',
        url:'/get-refund-types',
        success: function(resp, xhr, status) {
            console.log(resp)
            if(status.status == 200) {
                const refundTypes = resp;
                const refunds = JSON.parse($('#refunds').val());
                // const refundAmountSection = document.getElementById('refundAmountSection');
                // refundAmountSection.innerHTML = '';

                if(refunds.length > 0) {
                    // no full
                    populateRefundTypesSection(refundTypes.filter(rt => rt.type == 'Partial'));
                } else {
                    populateRefundTypesSection(refundTypes);
                }
                
                
            }
        }
    });

    $('#createRefund').on('click', createRefund);
})

function createRefund() {
    const refundTypeId =  $('#refundTypeSelect').val();
    const amount = $('#amount').val();
    const orderId = $('#orderId').val();

    $.ajax({
        type: 'post',
        url: '/create-refund',
        data: {refundTypeId: refundTypeId, amount:amount, orderId: orderId},
        success: function(resp, xhr, status) {

            if(status.status == 200) {
                location.reload();
            }
        }
    })
    
}


function populateRefundTypesSection(refundTypes) {
    console.log(refundTypes)
    const refundTypesSection = document.getElementById('refundTypesSection');
    refundTypesSection.innerHTML = '';
    
    const selectElement = document.createElement('select');
    selectElement.id = 'refundTypeSelect';
    selectElement.name = 'refundTypeSelect';
    selectElement.classList.add('form-control');

    refundTypes.forEach(refundType => {

        const option = document.createElement('option');
        option.value = refundType.id;
        option.text = refundType.type;

        selectElement.append(option);
    });

    selectElement.addEventListener('change', populateRefundAmountSection);
    
    selectElement.dispatchEvent(new Event('change'));
    refundTypesSection.append(selectElement);
}

function populateRefundAmountSection(event) {
    
    const refundTypeSelect = event.currentTarget;
    const selectedOption = refundTypeSelect.selectedOptions[0];
    const optionText = selectedOption.text;

    const refundAmountSection = document.getElementById('refundAmountSection');
    refundAmountSection.innerHTML = '';

    if(optionText == 'Partial') {
        const div = document.createElement('div');
        div.classList.add('col-12');

        const label = document.createElement('label');
        
        label.classList.add('mb-2');
        label.append('Refund Amount')
        const input = document.createElement('input');
        input.classList.add('form-control');
        input.type = 'text';
        input.placeholder = 'Refund Amount'
        input.required = true;
        input.id = 'amount';

        input.addEventListener('input', function() {
            validateIsNumber(this);
        });
        input.addEventListener('change', function() {
            validateDecimal(this)
            validateLessThanOrEqualToOutstanding(this);
            validateMoreThanZero(this);
        });

        div.append(label);
        div.append(input);
        refundAmountSection.append(div);
    }
}

function validateMoreThanZero(input) {

    const value = input.value;
    const number = parseFloat(value);

    if(number <= 0) {
        input.value = 0.01;
    }
}

function validateLessThanOrEqualToOutstanding(input) {
    const value = input.value;
    // Parse the input value as a floating-point number
    const number = parseFloat(value);

   $.ajax({
        type: 'get',
        url: '/get-outstanding-amount-for-order',
        data: {purchaseBasketId: $('#orderId').val()},
        success: function(resp, xhr, status) {
            if(status.status == 200) {
                console.log(resp)
                const max = resp.max;
                if(number > max) {
                    input.value = (max).toFixed(2);
                }

            }
        }
   })

    
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