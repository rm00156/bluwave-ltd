const { mockRequest } = require('mock-req-res');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestBasketItem } = require('../../helper/basketTestHelper');
const { getAllQuantities } = require('../../../utility/products/productOperations');
const { createFileGroup, setFileGroupForBasketItem } = require('../../../utility/basket/basketOperations');
const checkout = require('../../../middleware/checkout');

let quantities;
beforeAll(async () => {
  await setUpTestDb();
  quantities = await getAllQuantities();
});

describe('isArtworkRequired', () => {
  it('should proceed if number of basket items is the same as number of basket items with artwork', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const fileGroup = await createFileGroup();
    await setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    const req = mockRequest({
      user: {
        id: basketItem.accountFk,
      },
      session: {},
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await checkout.isArtworkRequired(req, res, next);
    expect(req.session.checkoutMessage).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('should proceed if number of basket items are not the same as number of basket items with artwork', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

    const req = mockRequest({
      user: {
        id: basketItem.accountFk,
      },
      session: {},
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    await checkout.isArtworkRequired(req, res, next);
    expect(req.session.checkoutMessage).toBe(true);
    expect(res.redirect).toHaveBeenCalled();
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
