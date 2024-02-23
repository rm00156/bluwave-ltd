// let verificationByUser = false;

function saveQuantities(e) {
    const form = document.getElementById('form');
    // $('#error').text('');

    if (form.checkValidity()) {
        e.preventDefault();
        // console.log('reece');
        const quantities = $('#quantities').val();
        const productId = $('#productId').val();
        
        return verify(quantities, productId);
       
    }

}

function displayPopupModal(message) {
    $('#overlay').attr('style', 'display:block;z-index:99999');
    $('#modal-message').text(message);
}

function cancelModal() {
    // verificationByUser = false;
    $('#overlay').attr('style', '');
}

function confirmModal() {
    save(true);
}

function save(override) {
    const productId = $('#productId').val();
    const quantities = $('#quantities').val();
    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    data.append('quantities', quantities);
    data.append('override', override);
    request.addEventListener('load', function (response) {

        const error = response.currentTarget.response.error;

        if(error) {
            // TO-DO
        } else {
            window.location = `/admin_dashboard/product/${productId}/page3`;
        }
    });


    request.open('post', `/product/${productId}/save_quantities`);
    request.send(data);
}

function verify(quantities, productId) {
    var data = new FormData();
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    $('#error').text('');
    // data.append('quantities', quantities);
    console.log(quantities)
    const encoded = encodeURIComponent(JSON.stringify(quantities));
    request.addEventListener('load', function (response) {

        const {valid, warning, message} = response.currentTarget.response;
        console.log(valid)
        console.log(warning)
        console.log(message)
        if(!valid) {
            // no change
            $('#error').text(message);
            return;
        }

        if(warning) {
            displayPopupModal(message);
            return;
        }

        save(false);
        
    });

    request.open('get', `/product/${productId}/verify_quantities?quantities=${encoded}`);
    request.send(data);
}


$(function () {

    $('#form').on('submit', saveQuantities);
    $('#cancelModal').on('click', cancelModal);
    $('#confirmModal').on('click', confirmModal);
})
