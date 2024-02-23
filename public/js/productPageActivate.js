
function activate(e) {
    const productId = $('#productId').val();
    if (form.checkValidity()) {
        e.preventDefault();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        request.addEventListener('load', function (response) {

            if(request.status == 400) {
                // const error = response.currentTarget.response.error;
                const page = response.currentTarget.response.page;
                
                return window.location = `/admin_dashboard/product/${productId}/${page}`;
            }
            
        
            return window.location = `/admin_dashboard/product/${productId}/page1`;

        });

        request.open('post', `/product/${productId}/activate`);
        request.send(data);
    }

}

$(function () {
    
    $('#form').on('submit', activate);

})