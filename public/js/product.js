var optionTypes = [];
var finishingOptionTypes = [];
var price;
var quantityId;
var productId;
var first = true;
$(function(){
    productId = $('#productId').val();
    setupOptionTypesQuantitiesAndPrices(productId);
    $('#addToBasket').on('click', addToBasket);
    $('#editBasket').on('click', editBasket);
})


function setupOptionTypesQuantitiesAndPrices(productId) {
    const priceMatrixOptions = $('#priceMatrixOptions').val();
    console.log(priceMatrixOptions)
    const finishingMatrixOptions = $('#finishingMatrixOptions').val();
    const parsedPriceMatrixOptions = priceMatrixOptions !== '' ? JSON.parse(priceMatrixOptions) : [];
    const parsedFinishingMatrixOptions = finishingMatrixOptions !== '' ? JSON.parse(finishingMatrixOptions) : [];

    $.ajax({
        type: 'get',
        url: `/product/${productId}/get_price_matrix_option_types_and_options`,
        success: function(response, xhr) {
                var optionsJson = response;
                const keys = Object.keys(optionsJson);

                for(var i = 0; i < keys.length; i++) {
                    var optionType = keys[i];
                    
                    var options = optionsJson[optionType];
                    var optionTypeId = options[0].optionTypeId
                    optionTypes.push({optionType: optionType, id: optionTypeId});
                    const disabled = options.length == 1 ? ' disabled ' : '';
                    var html = '<label class="mb-2">' + optionType + '</label>' +
                            '<select id="' + optionTypeId +'" class="form-control" name="options[]"'+ disabled + '>' 
                    for(var j = 0; j < options.length; j++) {

                        var option = options[j];
                        const selected = parsedPriceMatrixOptions.includes(option.optionId) ? 'selected' : '';
                        html = html + `<option ${selected} value=${option.optionId}>${option.name}</option>`;
                    }

                    html = html + '</select><br>';
                    $('#optionsSection').append(html);
                }


                // do this after

                $.ajax({
                    type: 'get',
                    url: `/product/${productId}/get_finishing_matrix_option_types_and_options`,
                    success: function(finishingResponse) {
                        var finishingOptionsJson = finishingResponse;
                        const keys = Object.keys(finishingOptionsJson);

                        for(var i = 0; i < keys.length; i++) {
                            var finishingOptionType = keys[i];
                            
                            var finishingOptions = finishingOptionsJson[finishingOptionType].options;
                            var finishingOptionTypeId = finishingOptions[0].optionTypeId
                            finishingOptionTypes.push({optionType: finishingOptionType, id: finishingOptionTypeId});
                            const disabled = finishingOptions.length == 1 ? ' disabled ' : '';
                            var finishingHtml = '<label class="mb-2">' + finishingOptionType + '</label>' +
                                    '<select id="' + finishingOptionTypeId +'" class="form-control" name="finishingOptions[]"'+ disabled + '>' 
                            for(var j = 0; j < finishingOptions.length; j++) {

                                var finishingOption = finishingOptions[j];
                                const selected = parsedFinishingMatrixOptions.includes(finishingOption.optionId) ? 'selected' : '';
                                finishingHtml = finishingHtml + `<option ${selected} value=${finishingOption.optionId}>${finishingOption.name}</option>`;
                            }

                            finishingHtml = finishingHtml + '</select><br>';
                            $('#finishingOptionSection').append(finishingHtml);
                        }
                        setupSelectListeners();
                        $('#' + optionTypes[0].id).trigger('change');
                    }
                })
                
            }
        // }
                // foreach of the optionTypes add listeners
                // which set the params to query the api to populate the quantity price table
    });

    function setupSelectListeners() {

        for(var i = 0; i < optionTypes.length; i++) {
            var optionType = optionTypes[i];
            console.log('#' + optionType.id)
            $('#' + optionType.id).on('change', updateQuantityPriceTable);
        }

        for(var i = 0; i < finishingOptionTypes.length; i++) {
            var optionType = finishingOptionTypes[i];
            console.log('#' + optionType.id)
            $('#' + optionType.id).on('change', updateQuantityPriceTable);
        }
    }


    function updateQuantityPriceTable() {
        var selectedOptions = [];
        for(var i = 0; i < optionTypes.length; i++) {
            var optionType = optionTypes[i];
            selectedOptions.push( { optionType: optionType.optionType, optionTypeId: optionType.id, value: $('#' + optionType.id).val()});
        }  

        var selectedFinishingOptions = [];
        for(var i = 0; i < finishingOptionTypes.length; i++) {
            var optionType = finishingOptionTypes[i];
            selectedFinishingOptions.push( { optionType: optionType.optionType, optionTypeId: optionType.id, value: $('#' + optionType.id).val()});
        }  

        $.ajax({
            type:'get',
            url:'/get_quantity_price_table_details',
            data:{options: JSON.stringify(selectedOptions), finishingOptions: JSON.stringify(selectedFinishingOptions),  productId: $('#productId').val()},
            success: function(response, xhr, status) {
                if(status.status == 204) {
                    console.log('No data found');
                    window.location = '/';
                } else {
                    const currentQuantityId = $('#currentQuantityId').val();
                    $('#quantityPriceTableSection').empty();
                    var tableDetails = response;
                    var html = '<table id="quantityPriceTable" style="cursor:pointer" class="table table-light mt-3 table-hover">' +
                                    '<thead>' +
                                        '<th>Quantity</th>' +
                                        '<th>Price per ' + $('#productType').val() + '</th>' +
                                        '<th>Pack Price</th>' +
                                    '</thead>' +
                                    '<tbody>';
                    let quantityIndex = 0;                        
                    for(var i = 0; i < tableDetails.length; i++) {
                        var defaultedSelectedRow = i == 0 ? 'class="table-active"' : '';
                        var tableDetail = tableDetails[i];
                        html = html + '<tr data-quantity="' + tableDetail.quantity + '" data-price="' + parseFloat(tableDetail.price).toFixed(2) + '" data-priceMatrixRowQuantityRowId="' + tableDetail.priceMatrixRowQuantityRowId + '"  data-quantityId="' + tableDetail.quantityId + '"' + defaultedSelectedRow + '>' +
                                        '<td>' + tableDetail.quantity + '</td>' +
                                        '<td style="font-weight: 500; color:green;">£' + parseFloat(tableDetail.pricePer).toFixed(2) + '</td>' +
                                        '<td style="font-weight: 500; color:green;">£' + parseFloat(tableDetail.price).toFixed(2) + '</td>' +
                                      '</tr>';
                        
                        if(currentQuantityId && tableDetail.quantityId === Number(currentQuantityId)){
                            quantityIndex = i + 1;
                        }

                    }

                    html = html + '</tbody></table>';

                    $('#quantityPriceTableSection').append(html);
                    $('#quantityPriceTable tbody tr').on('click', selectRow);
                    if(first && quantityIndex !== 0) {
                        $(`#quantityPriceTable tr:eq(${quantityIndex})`).trigger('click');
                    } else {
                        $('#quantityPriceTable tr:eq(1)').trigger('click');
                    }
                }
                first = false;
            },
            error: function(xhr, status, error) {
                if(xhr.status == 204) {
                    console.log('No data found');
                    window.location = '/';
                }
            }

            
        })
    }
    
    function selectRow(e) {
        console.log(e);
        $('#quantityPriceTable tr').removeClass('table-active');
        $(this).addClass('table-active');
        $('#summary').empty(); 
        quantityId = e.currentTarget.getAttribute('data-quantityid');  
        var priceMatrixRowQuantityRowId = e.currentTarget.getAttribute('data-pricematrixrowquantityrowid');  
        var quantity = e.currentTarget.getAttribute('data-quantity'); 
        price = e.currentTarget.getAttribute('data-price'); 
        var summaryHtml = '<tbody>';
        for(var i = 0; i < optionTypes.length; i++) {
            var optionType = optionTypes[i];
            summaryHtml = summaryHtml + '<tr>' + 
                                            '<td>' + optionType.optionType + '</td>' +
                                            '<td>' + $('#' + optionType.id).find(":selected").text() + '</td>'                          
                                        '</tr>';
        }  

        for(var i = 0; i < finishingOptionTypes.length; i++) {
            var optionType = finishingOptionTypes[i];
            summaryHtml = summaryHtml + '<tr>' + 
                                            '<td>' + optionType.optionType + '</td>' +
                                            '<td>' + $('#' + optionType.id).find(":selected").text() + '</td>'                          
                                        '</tr>';
        }  
        summaryHtml = summaryHtml + '<tr>' +
                                        '<td>Quantity</td>' + 
                                        '<td>' + quantity + '</td>' +
                                    '</tr>'  + 
                                    '<tr>' +
                                        '<td class="text-success" style="font-size: 20pt;font-weight:500;">Price</td>' + 
                                        '<td class="text-success" style="font-size: 20pt;font-weight:500;">£' + price + '</td>' +
                                    '</tr>';
        summaryHtml = summaryHtml + '</tbody>'; 
        $('#summary').append(summaryHtml);   
    }
}

function addToBasket() {
    const selectedOptions = [];
    const options = document.getElementsByName('options[]');

    options.forEach(item => {

        const option = item.selectedOptions[0];
        selectedOptions.push({id: option.value, option: option.text});
    });

    const selectedFinishingOptions = [];
    const finishingOptions = document.getElementsByName('finishingOptions[]');

    finishingOptions.forEach(finishingItem => {

        const finishingOption = finishingItem.selectedOptions[0];
        selectedFinishingOptions.push({id: finishingOption.value, option: finishingOption.text});
    });

    const data = {productId: productId, quantityId: quantityId, price: price, 
        selectedOptions: JSON.stringify(selectedOptions),
        selectedFinishingOptions: JSON.stringify(selectedFinishingOptions)};

    $.ajax({
        type: 'post',
        url: '/add_to_basket',
        data: data,
        success: function(req, xhr, status) {

            if(status.status == 201) {
                return window.location = '/basket';
            }

            location.reload();
        }
    })
}

function editBasket(e) {
    const basketItemId = e.currentTarget.getAttribute('data-basket-item');
    const selectedOptions = [];
    const options = document.getElementsByName('options[]');

    options.forEach(item => {

        const option = item.selectedOptions[0];
        selectedOptions.push({id: option.value, option: option.text});
    });

    const selectedFinishingOptions = [];
    const finishingOptions = document.getElementsByName('finishingOptions[]');

    finishingOptions.forEach(finishingItem => {

        const finishingOption = finishingItem.selectedOptions[0];
        selectedFinishingOptions.push({id: finishingOption.value, option: finishingOption.text});
    });

    const data = {quantityId: quantityId, price: price, basketItemId: basketItemId,
        selectedOptions: JSON.stringify(selectedOptions),
        selectedFinishingOptions: JSON.stringify(selectedFinishingOptions)};

    $.ajax({
        type: 'post',
        url: '/edit_basket_item',
        data: data,
        success: function(req, xhr, status) {

            if(status.status == 200) {
                return window.location = '/basket';
            }

            location.reload();
        }
    })
}