const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

const { createTestProduct } = require('../../helper/productTestHelper');
const productController = require('../../../controllers/ProductController');

let res;
beforeAll(async () => {
  await setUpTestDb();
}, 60000);

beforeEach(async () => {
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
});

describe('product controller', () => {
  it('should return redirect when product not found for product page 5', async () => {
    const req = {
      params: {
        id: 0,
      },
    };

    res.redirect = jest.fn();

    await productController.getProductPage5(req, res);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should return render when product found for product page 5', async () => {
    const product = await createTestProduct(true, true);
    const req = {
      params: {
        id: product.id,
      },
      session: {},
    };

    res.render = jest.fn();

    await productController.getProductPage5(req, res);
    expect(res.render).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables(['products']);
});
