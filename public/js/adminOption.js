
function updateOption(e) { 
    update(e, true);
}

function displayModal(productsWithPrintingOption, productsWithFinishingOption) {
    $('#overlay').attr('style', 'display:block;z-index:99999');

    const warningItems = document.getElementById('warning-items');

    const row = document.createElement('div');
    row.classList.add('row');

    const column1 = document.createElement('div');
    column1.classList.add('col-sm-12');

    productsWithPrintingOption.forEach(p => {

        const link = document.createElement('a');
        link.href = `/admin_dashboard/product/${p.productId}/page3`;
        link.append(p.name);

        const linkRow = document.createElement('div');
        linkRow.classList.add('row');
        linkRow.classList.add('text-center');
        linkRow.append(link)

        column1.append(linkRow);
    });

    productsWithFinishingOption.forEach(p => {

        const link = document.createElement('a');
        link.href = `/admin_dashboard/product/${p.productId}/page4`;
        link.append(p.name);

        const linkRow = document.createElement('div');
        linkRow.classList.add('row');
        linkRow.classList.add('text-center');
        linkRow.append(link)

        column1.append(linkRow);
    });

    row.append(column1);
    warningItems.append(row);
    // templates.forEach(t => {

    //     const link = document.createElement('a');
    //     link.href = `/admin_dashboard/template/${t.id}`;
    //     link.append(p.name);

    //     column1.append(link);
    // });




}

function cancelModal() {
    $('#overlay').attr('style', 'display:none;');
    $('#warning-items').empty();
}

function confirmModal(e) {
    update(e, false);
}

function update(e, isWithWarnings) {

    const nameElement = document.getElementById('name');
    nameElement.classList.remove('is-invalid');
    $('#error').text('');

    const form = document.getElementById('form');
    const optionId = $('#optionId').val();
    if (form.checkValidity()) {
        e.preventDefault();

        var data = new FormData();
        var request = new XMLHttpRequest();
        request.responseType = 'json';

        data.append('name', $('#name').val());
        data.append('withWarnings', isWithWarnings);

        request.addEventListener('load', function (response) {

            if (request.status == 400) {
                const error = response.currentTarget.response.error;
                nameElement.classList.add('is-invalid');
                nameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                $('#error').text(error);
                return;
            }

            if (request.status == 500) {
                const productsWithFinishingOption = response.currentTarget.response.productsWithFinishingOption;
                const productsWithPrintingOption = response.currentTarget.response.productsWithPrintingOption;
                
                // const templates = response.currentTarget.response.templates;

                return displayModal(productsWithPrintingOption, productsWithFinishingOption);

            }


            return window.location = `/admin_dashboard/option/${response.currentTarget.response.id}`;


            // var job = data.currentTarget.response;
            // jobs[job.id] = {id: job.id, state: "queued", totalSteps:job.totalSteps, productItemNumber: productItemNumber, productNumber: job.productNumber, productVariantId: job.productVariantId};
        });

        request.open('post', `/option/${optionId}/update`);
        request.send(data);
    }
}



$(function () {


    $('#form').on('submit', updateOption);
    $('#confirmModal').on('click', confirmModal);
    $('#cancelModal').on('click', cancelModal);

})
