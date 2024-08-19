const { createShippingDetail } = require('../../utility/delivery/deliveryOperations');
const { createTestCustomerAccount } = require('./accountTestHelper');
const { createPurchaseBasketAtDttm } = require('../../utility/order/orderOperations');
const {
  createFileGroup, createFileGroupItem, createBasketItem, setPurchaseBasketForBasketItem, getPurchaseBasketById,
} = require('../../utility/basket/basketOperations');
const { createTestProductWithPriceMatrix } = require('./productTestHelper');
const { getAllOptions, createOptionGroup, createOptionGroupItem } = require('../../utility/products/productOperations');

async function createTestShippingDetail() {
  const account = await createTestCustomerAccount();
  return createShippingDetail(
    account.id,
    'fullName',
    'email@email.com',
    'addressLine1',
    'addressLine2',
    'city',
    'postcode',
    '324534345',
    true,
    false,
  );
}

async function createTestShippingDetailWithAccountId(accountId) {
  return createShippingDetail(
    accountId,
    'fullName',
    'email@email.com',
    'addressLine1',
    'addressLine2',
    'city',
    'postcode',
    '324534345',
    true,
    false,
  );
}

async function createPurchaseBasketForAccountAtDttm(accountId, deliveryType, dttm) {
  const shippingDetail = await createTestShippingDetailWithAccountId(accountId);
  const fullName = 'fullName';
  const email = 'email';
  const phoneNumber = 'phoneNumber';
  const subTotal = '24.00';
  const total = '25.00';
  const deliveryPrice = '23.00';
  return createPurchaseBasketAtDttm(
    accountId,
    fullName,
    email,
    phoneNumber,
    subTotal,
    total,
    shippingDetail,
    deliveryType.id,
    deliveryPrice,
    dttm,
  );
}

async function createPurchaseBasketForAccount(accountId, deliveryType) {
  return createPurchaseBasketForAccountAtDttm(
    accountId,
    deliveryType,
    Date.now(),
  );
}

async function createTestFileGroupItemWithPathAndFileName(path, fileName) {
  const fileGroup = await createFileGroup();
  return createFileGroupItem(fileGroup.id, path, fileName);
}

async function createTestFileGroupItem() {
  return createTestFileGroupItemWithPathAndFileName('path', 'fileName');
}

async function createTestBasketItem(quantityGroup, saleFk) {
  const account = await createTestCustomerAccount();
  const options = await getAllOptions();
  const option = options[0];
  const quantityIds = quantityGroup.map((q) => q.id);
  const optionIds = [option.id];
  const rows = [
    {
      optionIdGroup: optionIds,
      quantityGroup,
    },
  ];

  const { product } = await createTestProductWithPriceMatrix(quantityIds, optionIds, rows);

  const optionGroup = await createOptionGroup();
  await createOptionGroupItem(optionGroup.id, optionIds[0]);
  return createBasketItem(
    account.id,
    product.id,
    optionGroup.id,
    null,
    quantityGroup[0].id,
    quantityGroup[0].price,
    quantityGroup[0].price,
    saleFk ?? null,
  );
}

async function createTestPurchaseBasketForBasketItem(accountId, deliveryType, dttm, basketItemId) {
  const purchaseBasket = await createPurchaseBasketForAccountAtDttm(accountId, deliveryType, dttm);
  await setPurchaseBasketForBasketItem(basketItemId, purchaseBasket.id);
  return getPurchaseBasketById(purchaseBasket.id);
}

module.exports = {
  createPurchaseBasketForAccount,
  createPurchaseBasketForAccountAtDttm,
  createTestBasketItem,
  createTestShippingDetail,
  createTestShippingDetailWithAccountId,
  createTestFileGroupItem,
  createTestFileGroupItemWithPathAndFileName,
  createTestPurchaseBasketForBasketItem,
};
