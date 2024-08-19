let table;
let saleId;

function deleteSale(e) {
    console.log(saleId)
    fetch(`/sale/${saleId}/delete`, {
      method: "delete",
    }).then(() => {
      window.location = `/admin-dashboard/sales`;
    });
}

function getAvailableProductsForSale() {
  const fromDt = $("#fromDt").val();
  const toDt = $("#toDt").val();

  if (((fromDt === "") === fromDt) === undefined || toDt === "" || toDt === undefined) return;

  table.clear();
  $.ajax({
    type: "get",
    url: `/products/no-active-sale/sale/${saleId}/${fromDt}/${toDt}`,
    success: function (products) {
      $.ajax({
        type: "get",
        url: `/sale/${saleId}/products`,
        success: function (data) {
          const { productIds } = data;

          products.forEach((product) => {
            const image = document.createElement("img");
            image.src = product.image1Path;
            image.width = "100";

            const span = document.createElement("span");
            span.classList.add("badge");
            if (product.deleteFl === 0) {
              span.classList.add("bg-light-primary");
              span.classList.add("text-dark-primary");
              span.append("Active");
            } else {
              span.classList.add("bg-light-danger");
              span.classList.add("text-dark-danger");
              span.append("Deactive");
            }
            // const input = document.createElement("input");
            // input.type = "checkbox";
            // input.value = productIds.includes(product.id) ? "checked" : "";

            const node = table.row.add([, image, product.name, product.productType, span]).draw(false).node();
            console.log(product.id)
            node.id = product.id;
            if (productIds.includes(product.id)) {
              node.classList.add("selected");
            //   
              $(node).find('input[type="checkbox"]').prop("checked", true);
            }
          });
        },
      });
    },
  });
}

$(function () {
  saleId = $("#saleId").val();


  $(".date").on("change", getAvailableProductsForSale);
  table = new DataTable("#products", {
    columnDefs: [
      {
        orderable: false,
        render: DataTable.render.select(),
        targets: 0,
      },
    ],
    fixedColumns: {
      start: 2,
    },
    order: [[1, "asc"]],
    paging: true,
    scrollCollapse: true,
    scrollX: true,
    scrollY: 600,
    select: {
      // style: 'os',
      selector: "td:first-child",
    },
  });

  getAvailableProductsForSale();

  $("#form").on("submit", updateSale);
  $("#delete").on("click", deleteSale);
});

function updateSale(e) {
  const form = document.getElementById("form");
  const ids = [];
  $("#error-name").text("");
  $("#error-percentage").text("");
  $("#error-fromDt").text("");
  $("#error-toDt").text("");
  $("#error-description").text("");
  $("#error-noChange").text("");

  table.rows((idx, data, node) => {
    const inputs = $(node).find('input[type="checkbox"]');
    if (inputs.prop("checked")) {
      const input = inputs[0];
      ids.push(input.parentNode.parentNode.id);
    }
  });

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
        const error = response.currentTarget.response.errors;
        let target = "";
        if (error.name) {
          $("#error-name").text(error.name);
          target = "error-name";
        }
        if (error.percentage) {
          $("#error-percentage").text(error.percentage);
          target = "error-percentage";
        }
        if (error.fromDt) {
          $("#error-fromDt").text(error.fromDt);
          target = "error-fromDt";
        }
        if (error.toDt) {
          $("#error-toDt").text(error.toDt);
          target = "error-toDt";
        }
        if (error.description) {
          $("#error-description").text(error.description);
          target = "error-description";
        }
        if (error.noChange) {
          $("#error-noChange").text("No changes made.");
          target = "title";
        }

        console.log(target);
        document.getElementById(target).scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      console.log(response);
      const saleId = response.currentTarget.response.id;
      return (window.location = `/admin-dashboard/sale/${saleId}`);
    });

    request.open("post", `/admin-dashboard/sale/${saleId}/update`);
    request.send(data);
  }
}
