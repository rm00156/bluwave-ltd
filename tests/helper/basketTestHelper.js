const { createShippingDetail } = require('../../utility/delivery/deliveryOperations');
const { createTestCustomerAccount } = require('./accountTestHelper');
const { createPurchaseBasketAtDttm } = require('../../utility/order/orderOperations');

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
module.exports = {
  createPurchaseBasketForAccount,
  createPurchaseBasketForAccountAtDttm,
  createTestShippingDetail,
  createTestShippingDetailWithAccountId,
};
