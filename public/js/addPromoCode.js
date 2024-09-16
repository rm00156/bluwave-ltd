let promoCodeTypes;
let table;

function selectPromoCodeType(e) {
  $("#promoCodeOptionSection").empty();
  const promoCodeTypeId = $("#promoCodeType").val();

  const filtered = promoCodeTypes.filter((p) => p.id === Number(promoCodeTypeId));
  if (filtered.length === 0) return;

  const promoCodeType = filtered[0].promoCodeType;

  const promoCodeOptionSection = document.getElementById("promoCodeOptionSection");
  const label = document.createElement("label");
  label.classList.add("form-label");

  const input = document.createElement("input");
  input.classList.add("form-control");
  input.type = "number";
  input.required = true;

  const pElement = document.createElement("p");
  pElement.classList.add("small");
  pElement.classList.add("text-danger");

  if (promoCodeType === "FreeDelivery") {
    label.append("Spend Over £(x)");
    input.id = "threshold";
    input.min = 0;
    pElement.id = "error-threshold";
  } else {
    label.append("Percentage (%) off");
    input.id = "percentage";
    input.min = 1;
    input.max = 100;
    pElement.id = "error-percentage";
  }

  promoCodeOptionSection.append(label);
  promoCodeOptionSection.append(input);
  promoCodeOptionSection.append(pElement);
}

function getPromoCodeTypes() {
  $.ajax({
    type: "get",
    url: "/promo-codes",
    success: function (data) {
      promoCodeTypes = data;

      const promoCodeTypeSection = document.getElementById("promoCodeTypeSection");

      const select = document.createElement("select");
      select.id = "promoCodeType";
      select.classList.add("form-control");

      promoCodeTypes.forEach((promoCodeType) => {
        const option = document.createElement("option");
        option.value = promoCodeType.id;
        option.append(promoCodeType.promoCodeType);

        select.append(option);
      });

      promoCodeTypeSection.append(select);
      $("#promoCodeType").on("change", selectPromoCodeType);
      $("#promoCodeType").trigger("change");
    },
  });
}

function createPromoCode(e) {
  $("#error-promo-code").text("");
  
  if($("#error-percentage")) {
    $("#error-percentage").text("");
  }

  if($("#error-threshold")) {
    $("#error-threshold").text("");
  }
    
  $("#error-fromDt").text("");
  $("#error-toDt").text("");
  $("#error-max-uses").text("");
  $("#error-description").text("");

  const form = document.getElementById("form");
  const ids = [];
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

    data.append("promoCodeTypeId", $("#promoCodeType").val());
    data.append("code", $("#promoCode").val());
    $("#percentage") ? data.append("percentage", $("#percentage").val()) : data.append("threshold", $("#threshold").val());
    data.append("fromDt", $("#fromDt").val());
    data.append("toDt", $("#toDt").val());
    data.append("maxUses", $("#maxUses").val());
    data.append("description", $("#description").val());
    data.append("ids", JSON.stringify(ids));

    request.addEventListener("load", function (response) {
      if (request.status == 400) {
        const error = response.currentTarget.response.error;

        if (error.promoCode) {
          $("#error-promo-code").text(error.code);
        }
        if (error.percentage) {
          $("#error-percentage").text(error.percentage);
        }
        if (error.threshold) {
          $("#error-threshold").text(error.threshold);
        }
        if (error.fromDt) {
          $("#error-fromDt").text(error.fromDt);
        }
        if (error.toDt) {
          $("#error-toDt").text(error.toDt);
        }

        if (error.maxUses) {
          $("#error-max-uses").text(error.maxUses);
        }
        if (error.description) {
          $("#error-description").text(error.description);
        }
        return;
      }
      const promoCodeId = response.currentTarget.response.id;
      return (window.location = `/admin-dashboard/promo-code/${promoCodeId}`);
    });

    request.open("post", `/admin-dashboard/promo-code/create`);
    request.send(data);
  }
}

function getAvailableProducts() {
  const fromDt = $("#fromDt").val();
  const toDt = $("#toDt").val();

  if (((fromDt === "") === fromDt) === undefined || toDt === "" || toDt === undefined) return;

  table.clear();

  const url = `/products/no-active-promo-code/${fromDt}/${toDt}`;
  $.ajax({
    type: "get",
    url,
    data: { fromDt, toDt },
    success: async function (products) {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
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
        const row = table.row.add([, image, product.name, product.productType, span]).draw(false);
        const rowNode = row.node();
        $(rowNode).attr("id", product.id);
      }
    },
  });
}

$(function () {
  getPromoCodeTypes();
  $(".date").on("change", getAvailableProducts);
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
    paging: false,
    scrollCollapse: true,
    scrollX: true,
    scrollY: 600,
    select: {
      // style: 'os',
      selector: "td:first-child",
    },
  });

  $("#form").on("submit", createPromoCode);
});
