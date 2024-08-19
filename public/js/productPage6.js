function continueToPage7(e) {
  const form = document.getElementById("form");
  const productId = $("#productId").val();
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

      return (window.location = `/product/${productId}/validate`);
    });

    request.open("post", `/product/${productId}/save-sale`);
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

$(function () {
  $("#form").on("submit", continueToPage7);
  $("#delete").on("click", deleteSale);
});
