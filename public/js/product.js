var optionTypes = [];
var price;
var quantityId;
var productId;

$(function(){
    productId = $('#productId').val();
    setupOptionTypesQuantitiesAndPrices(productId);
    $('#addToBasket').on('click', addToBasket);
})


function setupOptionTypesQuantitiesAndPrices(productId) {

    $.ajax({
        type: 'get',
        url: '/get_option_types_and_options_for_product',
        data: {productId: productId},
        success: function(response, xhr) {
            if(xhr.status === 201) {
                console.log('No data found');
                window.location = '/';
            } else {

                var optionsJson = response;
                console.log(optionsJson)
                const keys = Object.keys(optionsJson);

                for(var i = 0; i < keys.length; i++) {
                    var optionType = keys[i];
                    

                    
                    var options = optionsJson[optionType];
                    var optionTypeId = options[0].optionTypeId
                    optionTypes.push({optionType: optionType, id: optionTypeId});

                    var html = '<label class="mb-2">' + optionType + '</label>' +
                            '<select id="' + optionTypeId +'" class="form-control" name="options[]">' 
                    for(var j = 0; j < options.length; j++) {

                        var option = options[j];
                        html = html + '<option value=' + option.optionId + '>' + option.name + '</option>';
                    }

                    html = html + '</select><br>';
                    $('#optionsSection').append(html);
                }

                setupSelectListeners();
                $('#' + optionTypes[0].id).trigger('change');
            }
        }
                // foreach of the optionTypes add listeners
                // which set the params to query the api to populate the quantity price table
    });

    function setupSelectListeners() {

        for(var i = 0; i < optionTypes.length; i++) {
            var optionType = optionTypes[i];
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

        $.ajax({
            type:'get',
            url:'/get_quantity_price_table_details',
            data:{options: JSON.stringify(selectedOptions), productId: $('#productId').val()},
            success: function(response, xhr, status) {
                if(status.status == 204) {
                    console.log('No data found');
                    window.location = '/';
                } else {
                    $('#quantityPriceTableSection').empty();
                    var tableDetails = response;
                    var html = '<table id="quantityPriceTable" style="cursor:pointer" class="table table-light mt-3 table-hover">' +
                                    '<thead>' +
                                        '<th>Quantity</th>' +
                                        '<th>Price per ' + $('#productType').val() + '</th>' +
                                        '<th>Pack Price</th>' +
                                    '</thead>' +
                                    '<tbody>';
                                            
                    for(var i = 0; i < tableDetails.length; i++) {
                        var defaultedSelectedRow = i == 0 ? 'class="table-active"' : '';
                        var tableDetail = tableDetails[i];
                        html = html + '<tr data-quantity="' + tableDetail.quantity + '" data-price="' + parseFloat(tableDetail.price).toFixed(2) + '" data-priceMatrixRowQuantityRowId="' + tableDetail.priceMatrixRowQuantityRowId + '"  data-quantityId="' + tableDetail.quantityId + '"' + defaultedSelectedRow + '>' +
                                        '<td>' + tableDetail.quantity + '</td>' +
                                        '<td>' + parseFloat(tableDetail.pricePer).toFixed(2) + '</td>' +
                                        '<td>' + parseFloat(tableDetail.price).toFixed(2) + '</td>' +
                                      '</tr>'

                    }

                    html = html + '</tbody></table>';

                    $('#quantityPriceTableSection').append(html);
                    $('#quantityPriceTable tr').on('click', selectRow);
                    $('#quantityPriceTable tr:eq(1)').trigger('click');
                }

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
        summaryHtml = summaryHtml + '<tr>' +
                                        '<td>Quantity</td>' + 
                                        '<td>' + quantity + '</td>' +
                                    '</tr>'  + 
                                    '<tr>' +
                                        '<td>Price</td>' + 
                                        '<td>' + price + '</td>' +
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

    const data = {productId: productId, quantityId: quantityId, price: price, selectedOptions: JSON.stringify(selectedOptions)};

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