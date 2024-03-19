// var stripe = Stripe('pk_test_5cQWxxaMq14oogwEPGeNiiCG00naQUtjyS');
var stripe = Stripe('pk_live_aQTkfvwiROZzVl4MdtcFbrqh00Xcze97Y4');
$(function(){

    $('.delivery-options').on('change', getSelectedDeliveryOption);

    $('.delivery-options').trigger('change');

    $('#phoneNumber').on('change', validatePhoneNumber);

    $('#form').on('submit', checkout);

});

function validatePhoneNumber() {
    $('#phoneNumberError').text('');
    $.ajax({
        type: 'get',
        url: '/validate-phone-number',
        data: {phoneNumber: $('#phoneNumber').val()},
        success: function(response, xhr, status) {

            const errors = response.errors;
            if(status.status == 200) {
                if(errors.length > 0) {
                    $('#phoneNumber').val('');
                    $('#phoneNumberError').text(errors[0]);
                }
            }
        }
    })
}

function checkout(e) {

    e.preventDefault();
    const buttonElement = document.getElementById('submit');
    console.log(buttonElement)
    buttonElement.disabled = true;
    const selectedDelivery = document.querySelector('input[name="flexRadioDefault"]:checked');
    const deliveryName = selectedDelivery.getAttribute('data-delivery-name');
    const deliveryPrice = selectedDelivery.getAttribute('data-price');
    const deliveryTypeId = selectedDelivery.getAttribute('data-deliverytypeid');

    const url = window.location.href.replace('/checkout','');
    const data = {
            fullName: $('#fullName').val(),
            email: $('#email').val(),
            phoneNumber: $('#phoneNumber').val(),
            addressLine1: $('#addressLine1').val(),
            addressLine2: $('#addressLine2').val(),
            city: $('#city').val(),
            postCode: $('#postCode').val(),
            deliveryName: deliveryName,
            deliveryPrice: deliveryPrice,
            deliveryTypeId: deliveryTypeId,
            url: url
    };
    
    if(url.includes('https') || url.includes('localhost'))
    {
        $.ajax({
            type: 'post',
            url: '/checkout',
            data: data,
            success: function(response, xhr, status) {

                if(status.status == 201) {
                    stripe.redirectToCheckout({
                        // Make the id field from the Checkout Session creation API response
                        // available to this file, so you can provide it as parameter here
                        // instead of the {{CHECKOUT_SESSION_ID}} placeholder.
                        sessionId: response.session.id
                    }).then(function (result) {
                        // If `redirectToCheckout` fails due to a browser or network
                        // error, display the localized error message to your customer
                        // using `result.error.message`.
    
                        console.log(result)
                    });
                } else {
                    // display some sort of error
                    // validate phonenumber most likely invalid
                }
                
            }
        })
    } else {
        $('#buyError').text('To purchase you must be using a secure connection. Make sure the url for this site includes https:// and not http://');
    }

    buttonElement.disabled = false;
}

function getSelectedDeliveryOption() {
    var selectedDelivery = document.querySelector('input[name="flexRadioDefault"]:checked');
    const deliveryName = selectedDelivery.getAttribute('data-delivery-name');
    const deliveryPrice = selectedDelivery.getAttribute('data-price');
    const collectFl = selectedDelivery.getAttribute('data-collectfl');
    const deliverySubTotalSection = document.getElementById('deliverySubTotalSection');
    deliverySubTotalSection.innerHTML = '';

    const divElement = document.createElement('div');
    divElement.classList.add('col-sm-9')
    divElement.classList.add('col-xs-9')
    divElement.append(deliveryName);

    const row = document.createElement('div');
    row.classList.add('row');
    const divElement2 = document.createElement('div');
    divElement2.classList.add('fw-bold');
    divElement2.classList.add('col-sm-3')
    divElement2.classList.add('col-xs-3')
    divElement2.classList.add('text-lg-end')
    divElement2.append('£' + deliveryPrice)

    row.append(divElement);
    row.append(divElement2)
    deliverySubTotalSection.appendChild(row);

    var total = parseFloat(document.getElementById('subTotal').getAttribute('data-subtotal')) + parseFloat(deliveryPrice);
    total = total.toFixed(2);

    const totalElement = document.getElementById('total');
    totalElement.innerHTML = '';
    totalElement.innerHTML = '£' + total;
    totalElement.setAttribute('data-total',total);
    
    const addressSection = document.getElementById('addressSection');
    addressSection.innerHTML = '';
    if(collectFl == 'false') {

        const hr = document.createElement('hr');
        addressSection.append(hr);

        const addressTitle = document.createElement('h3');
        addressTitle.append('Delivery Address');
        addressTitle.classList.add('mb-3')

        addressSection.append(addressTitle);

        // const fullNameLabel = document.createElement('label');
        // fullNameLabel.append('Full Name');
        // fullNameLabel.classList.add('mb-3')
        // const spanFullName = document.createElement('span');
        // spanFullName.append(' *');
        // spanFullName.classList.add('text-danger');
        // fullNameLabel.append(spanFullName);

        // addressSection.append(fullNameLabel);

        // const fullName = document.createElement('input');
        // fullName.id = 'fullName';
        // fullName.name = 'fullName';
        // fullName.classList.add('form-control');
        // fullName.classList.add('mb-3')
        // fullName.type = "text";
        // fullName.required = true;
        // addressSection.append(fullName)
        
        const addressLine1Label = document.createElement('label');
        addressLine1Label.append('Address Line 1');
        addressLine1Label.classList.add('mb-3')
        const span = document.createElement('span');
        span.append(' *');
        span.classList.add('text-danger');
        addressLine1Label.append(span);

        addressSection.append(addressLine1Label);

        const addressLine1 = document.createElement('input');
        addressLine1.id = 'addressLine1';
        addressLine1.name = 'addressLine1';
        addressLine1.classList.add('form-control');
        addressLine1.classList.add('mb-3')
        addressLine1.type = "text";
        addressLine1.required = true;
        addressSection.append(addressLine1)

        
        const addressLine2Label = document.createElement('label');
        addressLine2Label.append('Address Line 2');
        addressLine2Label.classList.add('mb-3')
        addressSection.append(addressLine2Label);

        const addressLine2 = document.createElement('input');
        addressLine2.id = 'addressLine2';
        addressLine2.name = 'addressLine2';
        addressLine2.classList.add('form-control');
        addressLine2.classList.add('mb-3')
        addressLine2.type = "text";
        addressSection.append(addressLine2)

        const cityLabel = document.createElement('label');
        cityLabel.append('City/Town');
        cityLabel.classList.add('mb-3')
        const span2 = document.createElement('span');
        span2.append(' *');
        span2.classList.add('text-danger');
        cityLabel.append(span2);
        addressSection.append(cityLabel);

        const city = document.createElement('input');
        city.id = 'city';
        city.name = 'city';
        city.classList.add('form-control');
        city.classList.add('mb-3')
        city.type = "text";
        city.required = true;
        addressSection.append(city)
        
        const postCodeLabel = document.createElement('label');
        postCodeLabel.append('Post Code');
        postCodeLabel.classList.add('mb-3');
        const span3 = document.createElement('span');
        span3.append(' *');
        span3.classList.add('text-danger');
        postCodeLabel.append(span3);
        addressSection.append(postCodeLabel);

        const postCode = document.createElement('input');
        postCode.id = 'postCode';
        postCode.name = 'postCode';
        postCode.classList.add('form-control');
        postCode.type = "text";
        postCode.required = true;
        postCode.addEventListener('change', validatePostCode);
        addressSection.append(postCode);

        const postCodeError = document.createElement('p');
        postCodeError.append('Please enter a valid UK post code');
        postCodeError.classList.add('text-danger');
        postCodeError.style.display = 'none';
        postCodeError.id = 'postCodeError';

        addressSection.append(postCodeError);
    } 
}

function validatePostCode() {

    const postCode = $('#postCode').val();
    const postCodeError = document.getElementById('postCodeError');
    postCodeError.style.display = 'none';
    $.ajax({
        type: 'get',
        url: 'https://api.postcodes.io/postcodes/' + postCode + '/validate',
        success: function(response, xhr, status) {

            if(status.status == 200) {
                if(response.result == false) {
                    postCodeError.style.display = 'block';
                    postCode.value = '';
                }  
            } 
        }
    })
}