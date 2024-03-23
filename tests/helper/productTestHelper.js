const models = require('../../models');
const deliveryOperations = require('../../utilty/delivery/deliveryOperations');
const productOperations = require('../../utilty/products/productOperations');

async function createTestProduct(complete) {
  return productOperations.createDefaultProduct('ProductName', 1, complete ? 'Complete' : 'Incomplete');
}

async function createTestProductWithQuantities(quantityIds) {
  const product = await createTestProduct(false);
  const quantityGroup = await productOperations.createQuantityGroupAndSetQuantities(product.id, quantityIds);

  return { product, quantityGroup };
}

async function createTestProductWithPriceMatrix(quantityIds, options, rows) {
  const { product, quantityGroup } = await createTestProductWithQuantities(quantityIds);

  const priceMatrix = await productOperations.createPrintingAttributes(product.id, options, rows, true);

  const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(product.id);

  return {
    product, quantityGroup, priceMatrix, matrixRows,
  };
}

async function createTestProductWithFinishingMatrices(quantityIds, matrices) {
  const { product, quantityGroup } = await createTestProductWithQuantities(quantityIds);

  await productOperations.createFinishingMatrices(product.id, matrices);
  const finishingMatrices = await productOperations.getFinishingMatricesDetailsForProductId(product.id);

  return {
    product, quantityGroup, finishingMatrices,
  };
}

async function createTestProductWithPriceAndPrintingMatrix(quantityIds, options, rows, matrices) {
  const {
    product, quantityGroup, priceMatrix, matrixRows,
  } = await createTestProductWithPriceMatrix(
    quantityIds,
    options,
    rows,
  );

  await productOperations.createFinishingMatrices(product.id, matrices);
  const finishingMatrices = await productOperations.getFinishingMatricesDetailsForProductId(product.id);
  return {
    product, quantityGroup, priceMatrix, matrixRows, finishingMatrices,
  };
}

async function createTestProductWithDelivery() {
  const product = await createTestProduct(false);

  const deliveryOptions = await deliveryOperations.getAllActiveDeliveryTypes();
  const deliveryOption = deliveryOptions[0];

  const deliveryDetails = { deliveryId: deliveryOption.id, price: '10' };
  const delivery = await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryDetails);

  return {
    product, delivery,
  };
}

async function truncateQuantityGroupItemsAndGroups() {
  await models.quantityGroupItem.destroy({ truncate: true });
  await models.quantityGroup.destroy({ truncate: true });
}

module.exports = {
  // createCompleteTestProduct,
  createTestProduct,
  createTestProductWithDelivery,
  createTestProductWithFinishingMatrices,
  createTestProductWithPriceAndPrintingMatrix,
  createTestProductWithPriceMatrix,
  createTestProductWithQuantities,
  truncateQuantityGroupItemsAndGroups,
};
