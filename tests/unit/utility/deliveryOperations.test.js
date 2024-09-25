const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestShippingDetail } = require('../../helper/basketTestHelper');
const { createTestProductWithDelivery } = require('../../helper/productTestHelper');
const deliveryOperations = require('../../../utility/delivery/deliveryOperations');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('delivery operations', () => {
  it('should return null when no productDeliveries found for productIds', async () => {
    const deliveryOptions = await deliveryOperations.getDeliveryOptionsForProductIds([1, 2]);
    expect(deliveryOptions).toBeNull();
  });

  it('should return delivery options for products', async () => {
    const testProduct1 = await createTestProductWithDelivery(1, 5.0, 4, 10.0, 3);
    const testProduct2 = await createTestProductWithDelivery(3, 2.0, 9, 10.0, 4);
    const testProduct3 = await createTestProductWithDelivery(2, 1.0, 2, 3.0, 1);

    const deliveryOptions = await deliveryOperations.getDeliveryOptionsForProductIds([
      testProduct1.product.id,
      testProduct2.product.id,
      testProduct3.product.id,
    ]);
    expect(deliveryOptions).not.toBeNull();

    expect(deliveryOptions.collectionWorkingDays).toBe(3);
    expect(deliveryOptions.standardPrice).toBe('5.00');
    expect(deliveryOptions.standardWorkingDays).toBe(9);
    expect(deliveryOptions.expressPrice).toBe('10.00');
    expect(deliveryOptions.expressWorkingDays).toBe(4);
  });

  it('should return addressLine2 as null when input is empty string', async () => {
    const shippingDetail = await createTestShippingDetail('');

    const getShippingDetail = await deliveryOperations.getShippingDetailById(shippingDetail.id);
    expect(getShippingDetail).not.toBeNull();

    expect(getShippingDetail.accountFk).toBe(shippingDetail.accountFk);
    expect(getShippingDetail.fullName).toBe(shippingDetail.fullName);
    expect(getShippingDetail.email).toBe(shippingDetail.email);
    expect(getShippingDetail.addressLine1).toBe(shippingDetail.addressLine1);
    expect(getShippingDetail.addressLine2).toBeNull();
    expect(getShippingDetail.city).toBe(shippingDetail.city);
    expect(getShippingDetail.postCode).toBe(shippingDetail.postCode);
    expect(getShippingDetail.phoneNumber).toBe(shippingDetail.phoneNumber);
    expect(getShippingDetail.primaryFl).toBe(shippingDetail.primaryFl);
    expect(getShippingDetail.savedFl).toBe(shippingDetail.savedFl);
  });
  it('should return shipping detail when id exists', async () => {
    const shippingDetail = await createTestShippingDetail();

    const getShippingDetail = await deliveryOperations.getShippingDetailById(shippingDetail.id);
    expect(getShippingDetail).not.toBeNull();

    expect(getShippingDetail.accountFk).toBe(shippingDetail.accountFk);
    expect(getShippingDetail.fullName).toBe(shippingDetail.fullName);
    expect(getShippingDetail.email).toBe(shippingDetail.email);
    expect(getShippingDetail.addressLine1).toBe(shippingDetail.addressLine1);
    expect(getShippingDetail.addressLine2).toBe(shippingDetail.addressLine2);
    expect(getShippingDetail.city).toBe(shippingDetail.city);
    expect(getShippingDetail.postCode).toBe(shippingDetail.postCode);
    expect(getShippingDetail.phoneNumber).toBe(shippingDetail.phoneNumber);
    expect(getShippingDetail.primaryFl).toBe(shippingDetail.primaryFl);
    expect(getShippingDetail.savedFl).toBe(shippingDetail.savedFl);
  });

  it("should return null if id doesn't exist", async () => {
    const getShippingDetail = await deliveryOperations.getShippingDetailById(0);
    expect(getShippingDetail).toBeNull();
  });

  it('should return and create freeDelivery object', async () => {
    const freeDelivery = await deliveryOperations.createFreeDelivery('5.00');
    const getFreeDelivery = await deliveryOperations.getFreeDelivery();
    expect(getFreeDelivery.id).toBe(freeDelivery.id);
  });

  it('should update freeDelivery', async () => {
    const freeDelivery = await deliveryOperations.createFreeDelivery('5.00');
    const newSpendOver = '1000.00';
    await deliveryOperations.updateFreeDelivery(freeDelivery.id, newSpendOver);
    const getFreeDelivery = await deliveryOperations.getFreeDelivery();
    expect(getFreeDelivery.id).toBe(freeDelivery.id);
    expect(getFreeDelivery.spendOver).toBe(newSpendOver);
  });

  it('should return freeDelivery object', async () => {
    const freeDelivery = await deliveryOperations.createFreeDelivery('5.00');
    const getFreeDelivery = await deliveryOperations.getFreeDelivery();
    expect(getFreeDelivery.id).toBe(freeDelivery.id);
  });

  it('should delete freeDelivery when found', async () => {
    await deliveryOperations.createFreeDelivery('5.00');
    await deliveryOperations.deleteFreeDelivery();

    const getFreeDelivery = await deliveryOperations.getFreeDelivery();
    expect(getFreeDelivery).toBeNull();
    await deliveryOperations.deleteFreeDelivery();
  });
});

afterEach(async () => {
  await truncateTables(['accounts', 'productDeliveries', 'products', 'shippingDetails', 'freeDeliveries']);
});
