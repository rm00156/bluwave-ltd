
function cloneProduct(e) {
    const productId = e.currentTarget.getAttribute('data-product-id');

    $.ajax({
        type: 'post',
        url: `/product/${productId}/clone`,
        success: function(data) {
            const cloneProductId = data.id;
            window.location = `/admin-dashboard/product/${cloneProductId}/page1`;
        }
    })
}

$(function () {

   $('#clone').on('click', cloneProduct); 
})