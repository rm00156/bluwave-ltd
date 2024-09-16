const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const promoCodeOperations = require('../../../utility/promoCode/promoCodeOperations');
const { createTestPromoCode } = require('../../helper/promoCodeTestHelper');
const { createTestProduct } = require('../../helper/productTestHelper');
const { createTestBasketItem } = require('../../helper/basketTestHelper');
const { createOptionGroup, getAllQuantities } = require('../../../utility/products/productOperations');
const { createBasketItem, getBasketItem } = require('../../../utility/basket/basketOperations');
const { convertDateToString } = require('../../../utility/general/utilityHelper');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('promo code operations', () => {
  it('should return null when ids is an empty list', async () => {
    const promoCodeProducts = await promoCodeOperations.createPromoCodeProducts(1, []);
    expect(promoCodeProducts).toBeNull();
  });

  it('should return all promo codes', async () => {
    const { promoCode } = await createTestPromoCode();
    const allPromoCodes = await promoCodeOperations.getAllPromoCodes();

    expect(allPromoCodes.length).toBe(1);
    expect(allPromoCodes[0].id).toBe(promoCode.id);
  });

  it('should get products with no active promo code', async () => {
    const fromDt = '2024-01-01';
    const toDt = '2024-02-01';
    await createTestPromoCode(fromDt, toDt);

    const product = await createTestProduct(true, true);

    const productsWithNoActivePromoCodes = await promoCodeOperations.getProductsWithNoActivePromoCodes(fromDt, toDt);
    expect(productsWithNoActivePromoCodes.length).toBe(1);
    expect(productsWithNoActivePromoCodes[0].id).toBe(product.id);
  });

  it('should return promo code by id when found', async () => {
    const fromDt = '2024-01-01';
    const toDt = '2024-02-01';
    const { promoCode } = await createTestPromoCode(fromDt, toDt);

    const getPromoCode = await promoCodeOperations.getPromoCodeById(promoCode.id);

    expect(getPromoCode).not.toBe(null);
    expect(getPromoCode.id).toBe(promoCode.id);
    expect(getPromoCode.fromDt).toBe(fromDt);
    expect(getPromoCode.toDt).toBe(toDt);
  });

  it('should return null when no promo code found by id', async () => {
    const getPromoCode = await promoCodeOperations.getPromoCodeById(0);

    expect(getPromoCode).toBeNull();
  });

  it('should return products for promo code which overlap dates', async () => {
    const fromDt = '2024-01-01';
    const toDt = '2024-02-01';
    const { promoCode } = await createTestPromoCode(fromDt, toDt);

    const productsForPromoCodeIdWhichOverlapDates = await promoCodeOperations.getProductsForPromoCodeIdWhichOverlapDates(
      promoCode.id,
      fromDt,
      toDt,
    );
    expect(productsForPromoCodeIdWhichOverlapDates.length).toBe(1);
  });

  it('should return products with no active promo', async () => {
    const fromDt = '2024-01-01';
    const toDt = '2024-02-01';
    await createTestPromoCode(fromDt, toDt);

    const productsWithNoActivePromoCode = await promoCodeOperations.getProductsWithNoActivePromoCode(fromDt, toDt);
    expect(productsWithNoActivePromoCode.length).toBe(0);
  });

  it('should remove promo code from linked basket items', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );

    const { promoCode } = await createTestPromoCode();
    const setPercentagePromoCodeForBasketItems = await promoCodeOperations.setPercentagePromoCodeForBasketItems(
      currentPromoCode.id,
      promoCode.id,
      '[]',
      20,
    );

    const updatedBasketItem = await getBasketItem(basketItem.id);
    expect(updatedBasketItem.promoCodeFk).toBeNull();
    expect(updatedBasketItem.subTotal).toBe(price);
    expect(setPercentagePromoCodeForBasketItems).toBe(false);
  });

  it('should add promo code to basket items with new linked basket items', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );

    const percentage = 20;
    const newSubtotal = (parseFloat(price) * (1 - percentage / 100)).toFixed(2);
    const { promoCode, product } = await createTestPromoCode();
    const setPercentagePromoCodeForBasketItems = await promoCodeOperations.setPercentagePromoCodeForBasketItems(
      currentPromoCode.id,
      promoCode.id,
      `["${currentTestPromoCode.product.id}", "${product.id}"]`,
      percentage,
    );

    const updatedBasketItem = await getBasketItem(basketItem.id);
    expect(updatedBasketItem.promoCodeFk).toBe(promoCode.id);
    expect(updatedBasketItem.subTotal).toBe(newSubtotal);
    expect(setPercentagePromoCodeForBasketItems).toBe(true);
  });

  it('should update promo code', async () => {
    const { promoCode } = await createTestPromoCode();

    const code = 'newCode';
    const fromDt = '2024-11-01';
    const toDt = '2024-12-01';
    const description = 'newDescription';
    const percentage = 50;
    const { promoCodeTypeFk } = promoCode;
    const maxUses = 3;

    const updatedPromoCode = await promoCodeOperations.updatePromoCode(
      promoCode.id,
      code,
      fromDt,
      toDt,
      description,
      percentage,
      promoCodeTypeFk,
      maxUses,
      '["1"]',
    );

    const getOriginalPromoCode = await promoCodeOperations.getPromoCodeById(promoCode.id);
    expect(getOriginalPromoCode.deleteFl).toBe(1);

    expect(updatedPromoCode.code).toBe(code);
    expect(updatedPromoCode.description).toBe(description);
    expect(updatedPromoCode.percentage).toBe(percentage);
    expect(updatedPromoCode.promoCodeTypeFk).toBe(promoCodeTypeFk);
    expect(updatedPromoCode.maxUses).toBe(maxUses);

    const getUpdatedPromoCode = await promoCodeOperations.getPromoCodeById(updatedPromoCode.id);
    expect(getUpdatedPromoCode.fromDt).toBe(fromDt);
    expect(getUpdatedPromoCode.toDt).toBe(toDt);
  });

  it('should return null when no active promo code by code', async () => {
    const { promoCode } = await createTestPromoCode();

    const activePromoCodeByCode = await promoCodeOperations.getActivePromoCodeByCode(promoCode.code);
    expect(activePromoCodeByCode).toBeNull();
  });

  it('should return active promo code by code when one exists', async () => {
    const today = new Date();

    const formattedDate = convertDateToString(today);

    const { promoCode } = await createTestPromoCode(formattedDate, formattedDate, 10, 1);

    const activePromoCodeByCode = await promoCodeOperations.getActivePromoCodeByCode(promoCode.code);
    expect(activePromoCodeByCode).not.toBeNull();
  });

  it('should return active basket items where promo code has been applied for account', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );

    const activeBasketItems = await promoCodeOperations.getActiveBasketItemsWherePromoCodeAppliesForAccountId(account.id);
    expect(activeBasketItems.length).toBe(1);

    const activeBasketItem = activeBasketItems[0];
    expect(activeBasketItem.id).toBe(basketItem.id);
  });

  it('should apply promo code to basket items', async () => {
    const quantities = await getAllQuantities();

    const quantity = quantities[0];
    const price = '5.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

    const { promoCode } = await createTestPromoCode();
    await promoCodeOperations.applyPromoCode(promoCode, [basketItem.id]);

    const updatedBasketItem = await getBasketItem(basketItem.id);
    expect(updatedBasketItem.promoCodeFk).toBe(promoCode.id);

    const subTotal = (parseFloat(price) * (1 - promoCode.percentage / 100)).toFixed(2);
    expect(updatedBasketItem.subTotal).toBe(subTotal);
  });

  it('should remove promo code from basket items', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );

    await promoCodeOperations.removePromoCode([basketItem.id]);
    const updatedBasketItem = await getBasketItem(basketItem.id);

    expect(updatedBasketItem.promoCodeFk).toBeNull();
    expect(updatedBasketItem.subTotal).toBe(basketItem.price);
  });

  it('should return null when no promo code for product id', async () => {
    const product = await createTestProduct(true, true);
    const promoCodeForProductId = await promoCodeOperations.getPromoCodeForProductId(product.id, false);

    expect(promoCodeForProductId).toBeNull();
  });

  it('should return no active promo code for product id', async () => {
    const { promoCode, product } = await createTestPromoCode();
    const promoCodeForProductId = await promoCodeOperations.getPromoCodeForProductId(product.id, false);

    expect(promoCodeForProductId).not.toBeNull();
    expect(promoCodeForProductId.id).toBe(promoCode.id);
  });

  it('should return active promo code for product id', async () => {
    const today = new Date();
    const formattedDate = convertDateToString(today);
    const { promoCode, product } = await createTestPromoCode(formattedDate, formattedDate, 20);
    const promoCodeForProductId = await promoCodeOperations.getPromoCodeForProductId(product.id, true);

    expect(promoCodeForProductId).not.toBeNull();
    expect(promoCodeForProductId.id).toBe(promoCode.id);
  });

  it('should return null when no active promo code for the basket exists', async () => {
    const price = '10.00';
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();
    const product = await createTestProduct(true, true);
    const optionGroup = await createOptionGroup();

    await createBasketItem(account.id, product.id, optionGroup.id, null, quantity.id, price, price, null, null);
    const promoCode = await promoCodeOperations.getActivePromoCodeForBasketAndProduct(account.id, product.id);

    expect(promoCode).toBeNull();
  });

  it('should return promo code when active promo code for the basket exists for a matching product', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();
    const optionGroup = await createOptionGroup();

    await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );
    const promoCode = await promoCodeOperations.getActivePromoCodeForBasketAndProduct(
      account.id,
      currentTestPromoCode.product.id,
    );

    expect(promoCode).not.toBeNull();
    expect(promoCode.id).toBe(currentPromoCode.id);
  });

  it('should return false when update to first order promo code type but no accounts found with no order', async () => {
    // const account = await createTestCustomerAccount();
    const product = await createTestProduct(true, true);
    const today = new Date();
    const formattedDate = convertDateToString(today);
    const currentPromoCodeDetails = await createTestPromoCode();
    const { promoCode } = await createTestPromoCode(formattedDate, formattedDate, 20, product.id, 'FirstOrder');

    const setPercentagePromoCodeForBasketItems = await promoCodeOperations.setPercentagePromoCodeForBasketItems(
      currentPromoCodeDetails.promoCode.id,
      promoCode.id,
      `["${product.id}"]`,
      20,
    );

    expect(setPercentagePromoCodeForBasketItems).toBe(false);
  });

  it('should return true when update to first order promo code type where accounts found with no order', async () => {
    await createTestCustomerAccount();
    const product = await createTestProduct(true, true);
    const today = new Date();
    const formattedDate = convertDateToString(today);
    const currentPromoCodeDetails = await createTestPromoCode();
    const { promoCode } = await createTestPromoCode(formattedDate, formattedDate, 20, product.id, 'FirstOrder');

    const setPercentagePromoCodeForBasketItems = await promoCodeOperations.setPercentagePromoCodeForBasketItems(
      currentPromoCodeDetails.promoCode.id,
      promoCode.id,
      `["${product.id}"]`,
      20,
    );

    expect(setPercentagePromoCodeForBasketItems).toBe(true);
  });
});

afterEach(async () => {
  await truncateTables(['promoCodes', 'promoCodeProducts', 'products', 'basketItems', 'accounts', 'optionGroups']);
});
