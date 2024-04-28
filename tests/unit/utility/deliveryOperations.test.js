const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestShippingDetail } = require('../../helper/basketTestHelper');
const { createTestProduct } = require('../../helper/productTestHelper');

const deliveryOperations = require('../../../utility/delivery/deliveryOperations');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('get shipping detail by id', () => {
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
});

describe('get product deliveries for product', () => {
  it('should return all product deliveries for product', async () => {
    const product = await createTestProduct(true, true);
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const deliveryType = deliveryTypes[0];
    const deliveryOptions = {
      deliveryId: deliveryType.id,
      price: '55',
    };
    await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryOptions);

    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    expect(productDeliveries.length).toBe(1);
  });

  it('should return empty list when no product deliveries for product', async () => {
    const product = await createTestProduct(true, true);

    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    expect(productDeliveries.length).toBe(0);
  });
});

describe('get delivery type', () => {
  it('should return delivery type when id exists', async () => {
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const deliveryType = deliveryTypes[0];

    const getDeliveryType = await deliveryOperations.getDeliveryType(deliveryType.id);
    expect(getDeliveryType).not.toBeNull();
    expect(getDeliveryType.type).toBe(deliveryType.type);
  });

  it("should return null when id doesn't exist", async () => {
    const getDeliveryType = await deliveryOperations.getDeliveryType(0);
    expect(getDeliveryType).toBeNull();
  });
});

describe('update product deliveries for product', () => {
  it('should delete product delivery when delivery type not in deliveryOptions list', async () => {
    const product = await createTestProduct();
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const deliveryType = deliveryTypes[0];
    const deliveryOptions = {
      deliveryId: deliveryType.id.toString(),
      price: '55.00',
    };
    await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryOptions);

    const updateDeliveryOptions = [];
    await deliveryOperations.updateProductDeliveriesForProduct(product.id, updateDeliveryOptions);

    const getProductDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    expect(getProductDeliveries.length).toBe(0);
  });

  it('should update product delivery when in deliveryOptions list', async () => {
    const product = await createTestProduct();
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const deliveryType = deliveryTypes[0];
    const deliveryOptions = {
      deliveryId: deliveryType.id.toString(),
      price: '55.00',
    };
    const productDelivery = await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryOptions);
    const updateDeliveryOptions = [
      {
        price: '20.00',
        deliveryId: deliveryType.id.toString(),
      },
    ];
    await deliveryOperations.updateProductDeliveriesForProduct(product.id, updateDeliveryOptions);
    const getProductDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    expect(getProductDeliveries.length).toBe(1);

    const getProductDelivery = getProductDeliveries[0];
    expect(getProductDelivery.id).toBe(productDelivery.id);
    expect(getProductDelivery.price).toBe(updateDeliveryOptions[0].price);
  });

  it('should add new product delivery when new delivery type in deliveryOptions list', async () => {
    const product = await createTestProduct();
    const getProductDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const deliveryType = deliveryTypes[0];
    expect(getProductDeliveries.length).toBe(0);

    const updateDeliveryOptions = [
      {
        price: '20.00',
        deliveryId: deliveryType.id.toString(),
      },
    ];
    await deliveryOperations.updateProductDeliveriesForProduct(product.id, updateDeliveryOptions);
    const addedProductDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
    expect(addedProductDeliveries.length).toBe(1);

    const addedProductDelivery = addedProductDeliveries[0];
    expect(addedProductDelivery.price).toBe(updateDeliveryOptions[0].price);
    expect(addedProductDelivery.deliveryTypeFk).toBe(Number(updateDeliveryOptions[0].deliveryId));
  });
});

test('update product delivery price for delivery type and product', async () => {
  const product = await createTestProduct();
  const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
  const deliveryType = deliveryTypes[0];
  const deliveryOptions = {
    deliveryId: deliveryType.id,
    price: '55.00',
  };
  const productDelivery = await deliveryOperations.createDeliveryOptionForProduct(product.id, deliveryOptions);
  expect(productDelivery.price).toBe(deliveryOptions.price);

  const newPrice = '20.00';
  await deliveryOperations.updateProductDeliveryPriceForProductIdAndDeliveryType(newPrice, deliveryType.id, product.id);

  const updatedProductDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  expect(updatedProductDeliveries.length).toBe(1);
  const updatedProductDelivery = updatedProductDeliveries[0];
  expect(updatedProductDelivery.id).toBe(productDelivery.id);
  expect(updatedProductDelivery.price).toBe(newPrice);
});

afterEach(async () => {
  await truncateTables(['accounts', 'productDeliveries', 'products', 'shippingDetails']);
});
