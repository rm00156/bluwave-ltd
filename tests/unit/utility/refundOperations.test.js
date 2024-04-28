const refundOperations = require('../../../utility/refund/refundOperations');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createPurchaseBasketForAccount } = require('../../helper/basketTestHelper');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');
const { getAllActiveDeliveryTypes } = require('../../../utility/delivery/deliveryOperations');

let refundTypes;
let deliveryTypes;

beforeAll(async () => {
  await setUpTestDb();
  deliveryTypes = await getAllActiveDeliveryTypes();
  refundTypes = await refundOperations.getRefundTypes();
}, 60000);

test('should create refund', async () => {
  const account = await createTestCustomerAccount();
  const deliveryType = deliveryTypes[0];
  const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);

  const refundType = refundTypes[0];
  const refundAmount = '55';
  const refund = await refundOperations.createRefund(purchaseBasket.id, refundType.id, refundAmount);
  expect(refund).not.toBeNull();
  expect(refund.refundTypeFk).toBe(refundType.id);
  expect(refund.amount).toBe(refundAmount);
  expect(refund.purchaseBasketFk).toBe(purchaseBasket.id);
});

test('should return all refund types', async () => {
  expect(refundTypes.length).toBe(2);
});

describe('is refund possible for order', () => {
  it('should return false if full refund exists for order', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const fullRefundType = await refundOperations.getRefundTypeByType('Full Refund');
    const refundAmount = '55';
    await refundOperations.createRefund(purchaseBasket.id, fullRefundType.id, refundAmount);

    const refunds = await refundOperations.getRefundsForOrder(purchaseBasket.id);
    const isRefundPossibleForOrder = await refundOperations.isRefundPossibleForOrder(refunds, '5');

    expect(isRefundPossibleForOrder).toBe(false);
  });

  it('should return false if total partial refunds is greater than or equal to order total', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const partialRefundType = await refundOperations.getRefundTypeByType('Partial');
    const refundAmount = '10000';
    await refundOperations.createRefund(purchaseBasket.id, partialRefundType.id, refundAmount);
    await refundOperations.createRefund(purchaseBasket.id, partialRefundType.id, refundAmount);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasket.id);
    const isRefundPossibleForOrder = await refundOperations.isRefundPossibleForOrder(refunds, 200);

    expect(isRefundPossibleForOrder).toBe(false);
  });

  it('should return true if total partial refunds is less than order total', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const partialRefundType = await refundOperations.getRefundTypeByType('Partial');
    const refundAmount = '10000';
    await refundOperations.createRefund(purchaseBasket.id, partialRefundType.id, refundAmount);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasket.id);
    const isRefundPossibleForOrder = await refundOperations.isRefundPossibleForOrder(refunds, 200);

    expect(isRefundPossibleForOrder).toBe(true);
  });
});

describe('get max refund possible for order', () => {
  it('should return 0 if full refund exists for order', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const fullRefundType = await refundOperations.getRefundTypeByType('Full Refund');
    const refundAmount = '55';
    await refundOperations.createRefund(purchaseBasket.id, fullRefundType.id, refundAmount);

    const refunds = await refundOperations.getRefundsForOrder(purchaseBasket.id);
    const maxRefund = await refundOperations.getMaxRefundPossibleForOrder(refunds, '5');

    expect(maxRefund).toBe(0);
  });

  it('should return total order minus sum of total partial refunds', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = deliveryTypes[0];
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);
    const partialRefundType = await refundOperations.getRefundTypeByType('Partial');
    const refundAmount = '10000';
    await refundOperations.createRefund(purchaseBasket.id, partialRefundType.id, refundAmount);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasket.id);
    const maxRefund = await refundOperations.getMaxRefundPossibleForOrder(refunds, 200);

    expect(maxRefund).toBe(100);
  });
});

afterEach(async () => {
  await truncateTables(['accounts', 'refunds', 'purchaseBaskets']);
});
