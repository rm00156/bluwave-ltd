const setStatus = () => {
  $("#free-delivery-container").css("display", $("#freeDeliveryStatus").is(":checked") ? "block" : "none");
};

function validateDecimal(input) {
  const value = input.value;
  // Parse the input value as a floating-point number
  const number = parseFloat(value);

  if (isNaN(number)) {
    // Invalid input, set value to empty string
    input.value = "";
  } else {
    // Round the number to two decimal places
    const roundedNumber = number.toFixed(2);
    // Update the input value with the rounded number
    input.value = roundedNumber;
  }
}

function validateIsNumber(input) {
  const value = input.value;

  const regex = /^\d*\.?\d{0,2}$/;

  if (!regex.test(value)) {
    // Invalid input, clear the value or display an error message
    input.value = "";
    // Alternatively, you can display an error message to the user
    // and prevent form submission until a valid value is entered.
  }
}

function setUpSpendOver(input) {
  // inputs.each(input => {
  input.addEventListener("input", function () {
    validateIsNumber(this);
  });
  input.addEventListener("change", function () {
    validateDecimal(this);
    // });
  });
}

const updateFreeDelivery = (e) => {
  $("#error-spend-over").text("");
  const status = $("#freeDeliveryStatus").is(":checked");
  const spendOver = $("#spend-over").val();
  const form = document.getElementById("form");
  if (form.checkValidity()) {
    e.preventDefault();

    console.log('reece');
    $.ajax({
      type: "post",
      data: { status, spendOver },
      url: "/free-delivery/update",
      success: function (response, xhr, status) {
        const errors = response.errors;
        if (status.status == 400) {
          return $("#error-spend-over").text(errors.spendOver);
        }

        return (window.location = "/admin-dashboard/free-delivery");
      },
    });
  }
};

$(function () {
  $("#freeDeliveryStatus").on("change", setStatus);
  const spendOver = document.getElementById("spend-over");
  setUpSpendOver(spendOver);
  $("#form").on("submit", updateFreeDelivery);
});
