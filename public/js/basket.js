$(function(){

    $('.remove-item').on('click', removeBasketItem);
    $('.quantity').on('change', updateQuantity);
    // $('#checkout').on('click', checkout);
})

function removeBasketItem(e) {

    const basketItemId = e.currentTarget.getAttribute('data-basketitemid');
    const data = {basketItemId: basketItemId};
    $.ajax({
        type:'delete',
        url:'/remove-basket-item',
        data: data,
        success: function(req, xhr, status){

            if(status.status == 200)
            {
                return window.location = '/basket';
            }
        }
    })
}

function updateQuantity(e) {

    const selectElement = e.currentTarget;
    const basketItemId = selectElement.getAttribute('data-basketitemid');
    const selectedOptionId = selectElement.selectedOptions[0].value;
    const data = { basketItemId: basketItemId, quantityId: selectedOptionId };

    $.ajax({
        type: 'put',
        url: '/update-basket-quantity',
        data: data,
        success: function(req, xhr, status) {
            if(status.status == 200){
                window.location = '/basket'
            }
        }
    })
    console.log(selectedOptionId)
}

// function checkout(){

//     // check whether any artwork required
//     $('.artwork-required').css('display', 'none');
//     const addArtworkButtons = document.getElementsByClassName('add-artwork');
//     console.log(addArtworkButtons)
//     if(addArtworkButtons.length == 0) {
//         window.location = '/checkout';
//     } else {

//         $('.artwork-required').css('display', 'block');
//     }
// }