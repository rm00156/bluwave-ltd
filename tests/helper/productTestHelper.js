const models = require('../../models');
const deliveryOperations = require('../../utility/delivery/deliveryOperations');
const productOperations = require('../../utility/products/productOperations');

async function createTestProduct(complete, isActive) {
  return productOperations.createDefaultProduct('ProductName', 1, complete ? 'Complete' : 'Incomplete', !isActive);
}

async function createTestProductWithQuantities(quantityIds) {
  const product = await createTestProduct(false, true);
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
  const product = await createTestProduct(false, true);

  const deliveryOptions = await deliveryOperations.getAllActiveDeliveryTypes();
  const deliveryOption = deliveryOptions[0];

  const deliveryDetails = { deliveryId: deliveryOption.id, price: '10' };
  const delivery = await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryDetails);

  return {
    product, delivery,
  };
}

async function createPriceMatrix() {
  const product = await createTestProduct(true, true);
  const attributeType = await productOperations.getPrintingAttributeType();
  const optionTypeGroup = await productOperations.createOptionTypeGroup(product.id, attributeType.id);
  const quantityGroup = await productOperations.createQuantityGroup(product.id);

  return productOperations.createPriceMatrixForProduct(product.id, optionTypeGroup.id, 'Complete', quantityGroup.id);
}

async function truncateQuantityGroupItemsAndGroups() {
  await models.quantityGroupItem.destroy({ truncate: true });
  await models.quantityGroup.destroy({ truncate: true });
}

async function deleteQuantity(id) {
  await models.quantity.destroy({
    where: {
      id,
    },
  });
}

module.exports = {
  // createCompleteTestProduct,
  createPriceMatrix,
  createTestProduct,
  createTestProductWithDelivery,
  createTestProductWithFinishingMatrices,
  createTestProductWithPriceAndPrintingMatrix,
  createTestProductWithPriceMatrix,
  createTestProductWithQuantities,
  deleteQuantity,
  truncateQuantityGroupItemsAndGroups,
};
