const { mockRequest } = require('mock-req-res');
const shop = require('../../../middleware/shop');
const { createTestBasketItem } = require('../../helper/basketTestHelper');
const { getAllQuantities } = require('../../../utility/products/productOperations');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

let quantities;

beforeAll(async () => {
  await setUpTestDb();
  quantities = await getAllQuantities();
});

describe('isValidEditSession', () => {
  it('should proceed if edit is undefined', async () => {
    const req = mockRequest({});
    const res = jest.fn();
    const next = jest.fn();
    await shop.isValidEditSession(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect to /basket when basket item does not exist', async () => {
    const req = mockRequest({
      query: {
        edit: 1,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEditSession(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should redirect to /basket when basket item does exist but account id does not match user id', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const req = mockRequest({
      query: {
        edit: basketItem.id,
      },
      user: {
        id: 100,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEditSession(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should proceed when basket item does exist and account id does match user id', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const req = mockRequest({
      query: {
        edit: basketItem.id,
      },
      user: {
        id: basketItem.accountFk,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEditSession(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('isValidEdit', () => {
  it('should redirect to /basket if no basket item found', async () => {
    const req = mockRequest({
      body: {
        basketItemId: 0,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEdit(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should redirect to /basket when basket item does exist but account id does not match user id', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const req = mockRequest({
      body: {
        basketItemId: basketItem.id,
      },
      user: {
        id: 100,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEdit(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should proceed when basket item does exist and account id does match user id', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const req = mockRequest({
      body: {
        basketItemId: basketItem.id,
      },
      user: {
        id: basketItem.accountFk,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await shop.isValidEdit(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables([
    'accounts',
    'basketItems',
    'fileGroups',
    'fileGroupItems',
    'optionGroups',
    'optionGroupItems',
    'priceMatrices',
    'priceMatrixRows',
    'priceMatrixRowQuantityPrices',
    'products',
    'quantityGroups',
    'quantityGroupItems',
  ]);
});
