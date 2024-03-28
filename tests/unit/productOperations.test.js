const productOperations = require('../../utilty/products/productOperations');
const generalTestHelper = require('../helper/generalTestHelper');
const productTestHelper = require('../helper/productTestHelper');

test('create option group items for optionGroup id', async () => {
  const options = await productOperations.getAllOptions();
  const optionIds = options.map((o) => o.id);
  const optionGroup = await productOperations.createOptionGroup();

  await productOperations.createOptionGroupItems(optionGroup.id, optionIds);
  const optionGroupItems = await productOperations.getOptionGroupItemsByOptionGroupId(optionGroup.id);
  expect(optionGroupItems.length).toBe(optionIds.length);

  const optionGroupItemsOptionGroupIds = optionGroupItems.filter((og) => og.optionGroupFk === optionGroup.id);
  expect(optionGroupItemsOptionGroupIds.length).toBe(optionIds.length);
});

test('create price matrix row quantity prices for price matrix row id', async () => {
  const quantities = await productOperations.getAllQuantities();
  const quantityDetails = quantities.map((q) => ({ id: q.id, price: 5 }));
  const priceMatrix = await productTestHelper.createPriceMatrix();
  const optionGroup = await productOperations.createOptionGroup();

  const priceMatrixRow = await productOperations.createPriceMatrixRow(priceMatrix.id, optionGroup.id, 1);
  await productOperations.createPriceMatrixRowQuantityPricesForRow(priceMatrixRow.id, quantityDetails);

  const priceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPriceForRow(priceMatrixRow.id);
  expect(priceMatrixRowQuantityPrices.length).toBe(quantityDetails.length);
});

afterEach(async () => {
  await generalTestHelper.truncateTables(['optionGroupItems', 'optionGroups', 'priceMatrices', 'priceMatrixRows', 'priceMatrixRowQuantityPrices',
    'optionTypeGroups', 'quantityGroups', 'products']);
});
