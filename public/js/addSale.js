let table;


function getAvailableProducts() {

  const fromDt = $('#fromDt').val();
  const toDt = $('#toDt').val();

  if(fromDt === '' === fromDt === undefined || toDt === '' || toDt === undefined)
    return;

  table.clear();

  const url = `/products/no-active-sale/${fromDt}/${toDt}`;
  $.ajax({
    type: 'get',
    url,
    data: {fromDt, toDt},
    success: function(products) {
      console.log(products)
      products.forEach(product => {
        const image = document.createElement('img');
        image.src = product.image1Path;
        image.width = '100';

        const span = document.createElement('span');
        span.classList.add('badge');
        if(product.deleteFl === 0) {
          span.classList.add('bg-light-primary');
          span.classList.add('text-dark-primary');
          span.append('Active');

        } else {
          span.classList.add('bg-light-danger');
          span.classList.add('text-dark-danger');
          span.append('Deactive');
        }
        const node = table.row.add([, image, product.name, product.productType, span]).draw(false).node();
        node.id = product.id;
      })
      
    }
  })
}


$(function(){

  $('.date').on('change', getAvailableProducts);
    table = new DataTable('#products', {
        columnDefs: [
            {
                orderable: false,
                render: DataTable.render.select(),
                targets: 0
            }
        ],
        fixedColumns: {
            start: 2
        },
        order: [[1, 'asc']],
        paging: true,
        scrollCollapse: true,
        scrollX: true,
        scrollY: 600,
        select: {
            // style: 'os',
            selector: 'td:first-child'
        }
    });

    // $('button').on('click', function () {
    //     var data = table
    //     .rows( function ( idx, data, node ) {
    //         const x = $(node).find('input[type="checkbox"]').prop('checked');
    //         if(x) {
    //             return $(node).find('input[type="checkbox"]')[0].parentNode.parentNode;
    //         }
    //     } ).map(element => {
    //         return element.id
    //     })
    //     .toArray();
        
    //     console.log(data);
        
        
    // })

    // table
    // .rows( function ( idx, data, node ) {
    //     return $(node).find('input[type="checkbox"]').prop('checked', true);
    // } )

    // $('#products').DataTable({
    //     columnDefs: [
    //         {
    //             orderable: false,
    //             render: DataTable.render.select(),
    //             targets: 0
    //         }
    //     ],
    //     fixedColumns: {
    //         start: 2
    //     },
    //     order: [[1, 'asc']],
    //     paging: false,
    //     scrollCollapse: true,
    //     scrollX: true,
    //     scrollY: 300,
    //     select: {
    //         style: 'os',
    //         selector: 'td:first-child'
    //     }
    // });

    $("#form").on("submit", createSale);
    $("#delete").on("click", deleteSale);
})



function createSale(e) {
    const form = document.getElementById("form");
    const ids = [];
    table.rows(( idx, data, node ) => {

      const inputs = $(node).find('input[type="checkbox"]');
      if(inputs.prop('checked')) {
        const input = inputs[0];
        ids.push(input.parentNode.parentNode.id)
      }
    })

    if (form.checkValidity()) {
      e.preventDefault();
  
      var data = new FormData();
      var request = new XMLHttpRequest();
      request.responseType = "json";
  
      data.append("name", $("#name").val());
      data.append("percentage", $("#percentage").val());
      data.append("fromDt", $("#fromDt").val());
      data.append("toDt", $("#toDt").val());
      data.append("description", $("#description").val());
      data.append("ids", JSON.stringify(ids));
  
      request.addEventListener("load", function (response) {
        if (request.status == 400) {
          const error = response.currentTarget.response.error;
          if (error.name) {
            $("#error-name").text(error.name);
          }
          if (error.percentage) {
            $("#error-percentage").text(error.percentage);
          }
          if (error.fromDt) {
            $("#error-fromDt").text(error.fromDt);
          }
          if (error.toDt) {
            $("#error-toDt").text(error.toDt);
          }
          if (error.description) {
            $("#error-description").text(error.description);
          }
          return;
        }
        const saleId = response.currentTarget.response.id
        return (window.location = `/admin-dashboard/sale/${saleId}`);
      });
  
      request.open("post", `/admin-dashboard/sale/create`);
      request.send(data);
    }
  }
  
  function deleteSale(e) {
    const productId = $("#productId").val();
    const saleId = e.currentTarget.getAttribute('data-sale-id');
    fetch(`/product/${productId}/sale/${saleId}/delete`, {
      method: "delete",
    }).then(() => {
      window.location = `/admin-dashboard/product/${productId}/page6`;
    });
  }
  
