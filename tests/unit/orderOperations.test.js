const { setUpTestDb, truncateTables } = require('../helper/generalTestHelper');
const { createTestShippingDetail, createPurchaseBasketForAccount } = require('../helper/basketTestHelper');
const orderOperations = require('../../utility/order/orderOperations');
const { getAllActiveDeliveryTypes } = require('../../utility/delivery/deliveryOperations');
const { createTestCustomerAccount } = require('../helper/accountTestHelper');
const { getPurchaseBasketById } = require('../../utility/basket/basketOperations');

let deliveryTypes;

beforeAll(async () => {
  await setUpTestDb();

  deliveryTypes = await getAllActiveDeliveryTypes();
}, 60000);

test('should return created purchase basket', async () => {
  const shippingDetail = await createTestShippingDetail();
  const accountId = shippingDetail.accountFk;

  const fullName = 'fullName';
  const email = 'email';
  const phoneNumber = 'phoneNumber';
  const subTotal = '24';
  const total = '25';
  const deliveryPrice = '23';
  const deliveryType = deliveryTypes[0];
  const purchaseBasket = await orderOperations.createPurchaseBasket(
    accountId,
    fullName,
    email,
    phoneNumber,
    subTotal,
    total,
    shippingDetail,
    deliveryType.id,
    deliveryPrice,
  );

  expect(purchaseBasket).not.toBeNull();
  expect(purchaseBasket.accountFk).toBe(accountId);
  expect(purchaseBasket.fullName).toBe(fullName);
  expect(purchaseBasket.email).toBe(email);
  expect(purchaseBasket.phoneNumber).toBe(phoneNumber);
  expect(purchaseBasket.subTotal).toBe(subTotal);
  expect(purchaseBasket.status).toBe('Pending');
  expect(purchaseBasket.createdDttm).not.toBeNull();
  expect(purchaseBasket.total).toBe(total);
  expect(purchaseBasket.deliveryPrice).toBe(deliveryPrice);
  expect(purchaseBasket.shippingDetailFk).toBe(shippingDetail.id);
  expect(purchaseBasket.deliveryTypeFk).toBe(deliveryType.id);
});

test('purchase basket status should be updated to complete', async () => {
  const account = await createTestCustomerAccount();
  const deliveryType = deliveryTypes[0];
  const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);

  expect(purchaseBasket.status).toBe('Pending');
  const dttm = new Date();
  await orderOperations.completePurchaseBasket(purchaseBasket.id, dttm);

  const completedPurchaseBasket = await getPurchaseBasketById(purchaseBasket.id);

  expect(completedPurchaseBasket.status).toBe('Completed');
  expect(completedPurchaseBasket.orderNumber).toBe(`blu-${completedPurchaseBasket.id}`);
});

describe('get purchase basket with id and account id', () => {
  it("should return null if id and accountId don't match", async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    expect(purchaseBasket).not.toBeNull();

    const getPurchaseBasket = await orderOperations.getPurchaseBasketWithIdAndAccountId(purchaseBasket.id, 0);
    expect(getPurchaseBasket).toBeNull();
  });

  it("should return purchaseBasket if id and accountId don't match", async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    expect(purchaseBasket).not.toBeNull();

    const getPurchaseBasket = await orderOperations.getPurchaseBasketWithIdAndAccountId(purchaseBasket.id, account.id);
    expect(getPurchaseBasket).not.toBeNull();
  });
});

describe('get successful orders for account id', () => {
  it('should return successful orders for account only', async () => {
    const deliveryType = deliveryTypes[0];
    const account = await createTestCustomerAccount();
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const dttm = new Date();
    await orderOperations.completePurchaseBasket(purchaseBasket.id, dttm);

    const successfulOrderForAccount = await orderOperations.getSuccessfulOrdersForAccountId(account.id);
    expect(successfulOrderForAccount.length).toBe(1);
  });

  it('should return no successful orders for account', async () => {
    const deliveryType = deliveryTypes[0];
    const account = await createTestCustomerAccount();
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const dttm = new Date();
    await orderOperations.completePurchaseBasket(purchaseBasket.id, dttm);

    const secondAccount = await createTestCustomerAccount();
    const successfulOrderForSecondAccount = await orderOperations.getSuccessfulOrdersForAccountId(secondAccount.id);
    expect(successfulOrderForSecondAccount.length).toBe(0);
  });
});

describe('get successful order for purchase basket id', () => {
  it('should return successful order for purchase basket', async () => {
    const deliveryType = deliveryTypes[0];
    const account = await createTestCustomerAccount();
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const dttm = new Date();
    await orderOperations.completePurchaseBasket(purchaseBasket.id, dttm);

    const getPurchaseBasket = await orderOperations.getSuccessfulOrderForPurchaseBasketId(purchaseBasket.id);
    expect(getPurchaseBasket).not.toBeNull();

    expect(getPurchaseBasket.accountFk).toBe(purchaseBasket.accountFk);
    expect(getPurchaseBasket.fullName).toBe(purchaseBasket.fullName);
    expect(getPurchaseBasket.email).toBe(purchaseBasket.email);
    expect(getPurchaseBasket.phoneNumber).toBe(purchaseBasket.phoneNumber);
    expect(getPurchaseBasket.subTotal).toBe(purchaseBasket.subTotal);
    expect(getPurchaseBasket.status).toBe('Completed');
    expect(getPurchaseBasket.total).toBe(purchaseBasket.total);
    expect(getPurchaseBasket.deliveryPrice).toBe(purchaseBasket.deliveryPrice);
    expect(getPurchaseBasket.shippingDetailFk).toBe(purchaseBasket.shippingDetailFk);
    expect(getPurchaseBasket.deliveryTypeFk).toBe(purchaseBasket.deliveryTypeFk);
    expect(getPurchaseBasket.purchaseDttm).not.toBeNull();
  });

  it('should return null as purchase basket is not complete', async () => {
    const deliveryType = deliveryTypes[0];
    const account = await createTestCustomerAccount();
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);

    const getPurchaseBasket = await orderOperations.getSuccessfulOrderForPurchaseBasketId(purchaseBasket.id);
    expect(getPurchaseBasket).toBeNull();
  });

  it("should return null as purchase basket doesn't exist", async () => {
    const getPurchaseBasket = await orderOperations.getSuccessfulOrderForPurchaseBasketId(0);
    expect(getPurchaseBasket).toBeNull();
  });
});

describe('get all successful orders', () => {
  it('should return all successful orders', async () => {
    const deliveryType = deliveryTypes[0];
    const account = await createTestCustomerAccount();
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const dttm = new Date();
    await orderOperations.completePurchaseBasket(purchaseBasket.id, dttm);

    const secondAccount = await createTestCustomerAccount();
    const secondPurchaseBasket = await createPurchaseBasketForAccount(secondAccount.id, deliveryType);
    await orderOperations.completePurchaseBasket(secondPurchaseBasket.id, dttm);

    const successfulOrders = await orderOperations.getAllCompletedOrders();
    expect(successfulOrders.length).toBe(2);
    expect(successfulOrders.filter((s) => s.id === purchaseBasket.id || secondPurchaseBasket.id).length).toBe(2);
  });

  it('should return no successful orders for account', async () => {
    const successfulOrders = await orderOperations.getAllCompletedOrders();
    expect(successfulOrders.length).toBe(0);
  });
});

test('update purchase basket with orderId', async () => {
  const deliveryType = deliveryTypes[0];
  const account = await createTestCustomerAccount();
  const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
  expect(purchaseBasket.orderId).toBeNull();

  const orderId = 'orderId';
  await orderOperations.updatePurchaseBasketWithOrderId(purchaseBasket.id, orderId);

  const updatedPurchaseBasket = await getPurchaseBasketById(purchaseBasket.id);
  expect(updatedPurchaseBasket.orderId).not.toBeNull();
  expect(updatedPurchaseBasket.orderId).toBe(orderId);
});

describe('get order details for orders in the last month', () => {
  it('should return no orders if no orders made', async () => {
    const { total, count } = await orderOperations.getOrderDetailsInLastMonth();
    expect(total).toBeNull();
    expect(count).toBe(0);
  });

  it('should return no orders if no orders made in the last month', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const currentDate = new Date();

    // Subtract 45 days from the current date
    const pastDate = new Date(currentDate.getTime() - 32 * 24 * 60 * 60 * 1000);

    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    await orderOperations.completePurchaseBasket(purchaseBasket.id, pastDate);

    const { total, count } = await orderOperations.getOrderDetailsInLastMonth();
    expect(total).toBeNull();
    expect(count).toBe(0);
  });

  it('should return orders if made in the last month', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];

    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    await orderOperations.completePurchaseBasket(purchaseBasket.id, Date.now());

    const { total, count } = await orderOperations.getOrderDetailsInLastMonth();
    expect(total).toBe(Number(purchaseBasket.total));
    expect(count).toBe(1);
  });
});

afterEach(async () => {
  await truncateTables(['accounts', 'shippingDetails', 'purchaseBaskets']);
});
