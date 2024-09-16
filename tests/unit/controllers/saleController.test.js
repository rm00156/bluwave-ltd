const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestSale } = require('../../helper/saleTestHelper');
const { getProductDetailById } = require('../../../utility/products/productOperations');
const { createTestProduct } = require('../../helper/productTestHelper');
const { createTestBasketItem } = require('../../helper/basketTestHelper');
const { getAllQuantities } = require('../../../utility/products/productOperations');
const { getBasketItem } = require('../../../utility/basket/basketOperations');

const saleController = require('../../../controllers/SaleController');
const { getSaleById } = require('../../../utility/sales/salesOperations');

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

describe('admin dashboard controller', () => {
  it('should return status 400 when validateDate returns errors', () => {
    const req = {
      params: {
        id: 1,
        fromDt: '',
        toDt: '',
      },
    };

    saleController.getProductWithNoActiveSalesForSale(req, res);
    const errors = {
      fromDt: 'Please enter valid date',
      toDt: 'Please enter valid date',
    };

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return status 200 and list of products with no active sales for sale', async () => {
    const { sale, product } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
        fromDt: '2022-01-01',
        toDt: '2023-01-01',
      },
    };

    await saleController.getProductWithNoActiveSalesForSale(req, res);
    const productDetail = await getProductDetailById(product.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([productDetail]);
  });

  it('should return status 400 when validate date fails for getProductWithNoActiveSales', () => {
    const req = {
      params: {
        fromDt: '',
        toDt: '',
      },
    };

    saleController.getProductWithNoActiveSales(req, res);
    const errors = {
      fromDt: 'Please enter valid date',
      toDt: 'Please enter valid date',
    };

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return products with no linked active sale', async () => {
    const product = await createTestProduct(true, true);
    const req = {
      params: {
        fromDt: '2022-01-01',
        toDt: '2023-01-01',
      },
    };

    await saleController.getProductWithNoActiveSales(req, res);
    const productDetail = await getProductDetailById(product.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([productDetail]);
  });

  it('should return status 400 for create sale when validate sale fails', () => {
    const req = {
      body: {
        name: '',
        fromDt: '2022-01-01',
        toDt: '2022-01-01',
        description: 'description',
        percentage: '10',
        ids: '["1"]',
      },
    };

    const errors = {
      name: 'Please enter name between 3 and 50 characters in length.',
    };
    saleController.createSale(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return status 200 for create sale when validate sale is successful', async () => {
    const product = await createTestProduct(true, true);
    const req = {
      body: {
        name: 'name',
        fromDt: '2022-01-01',
        toDt: '2022-01-01',
        description: 'description',
        percentage: '10',
        ids: `["${product.id}"]`,
      },
    };
    await saleController.createSale(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: expect.any(Number) });
  });

  it('should redirect if no sale found for id when getting sale page', async () => {
    const req = {
      params: {
        id: 0,
      },
    };

    res.redirect = jest.fn();
    await saleController.getSalePage(req, res);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should render page if sale found for id when getting sale page', async () => {
    const { sale } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },
    };

    res.render = jest.fn();
    await saleController.getSalePage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should return 400 status when sale not found for id when update sale', async () => {
    const req = {
      params: {
        id: 0,
      },
    };

    const error = {
      error: 'No sale found',
    };
    await saleController.updateSale(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  it('should return 400 status when sale found for id but validation failed when update sale', async () => {
    const { sale } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },

      body: {
        name: '',
        fromDt: '2022-01-01',
        toDt: '2022-01-01',
        description: 'description',
        percentage: '10',
        ids: '["1"]',
      },
    };

    const error = {
      name: 'Please enter name between 3 and 50 characters in length.',
    };
    await saleController.updateSale(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  it('should return 400 status when sale found for id but no changes made when update sale', async () => {
    const fromDtString = '2022-01-01';
    const toDtString = '2023-01-01';
    const { sale, product } = await createTestSale(fromDtString, toDtString);
    const req = {
      params: {
        id: sale.id,
      },

      body: {
        name: sale.name,
        fromDt: fromDtString,
        toDt: toDtString,
        description: sale.description,
        percentage: sale.percentage.toString(),
        ids: `["${product.id}"]`,
      },
    };

    const error = {
      errors: {
        noChange: true,
      },
    };
    await saleController.updateSale(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  it('should return 200 status with new sale when update sale', async () => {
    const fromDtString = '2022-01-01';
    const toDtString = '2024-01-01';
    const { sale, product } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },

      body: {
        name: sale.name,
        fromDt: fromDtString,
        toDt: toDtString,
        description: sale.description,
        percentage: sale.percentage.toString(),
        ids: `["${product.id}"]`,
      },
    };

    await saleController.updateSale(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: expect.any(Number) });
  });

  it('should return 200 status for get sale products', async () => {
    const { sale, product } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },
    };

    await saleController.getSaleProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ productIds: [product.id] });
  });

  it('should return 200 status when no basket items with sale for deleteSale', async () => {
    const { sale } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },
    };

    await saleController.deleteSale(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();

    const deletedSale = await getSaleById(sale.id);
    expect(deletedSale).toBeNull();
  });

  it('should return 200 status when there are basket items with sale for deleteSale', async () => {
    const quantities = await getAllQuantities();
    const quantity = quantities[0];
    const price = '5.00';
    const { sale } = await createTestSale();
    const req = {
      params: {
        id: sale.id,
      },
    };
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }], sale.id);

    await saleController.deleteSale(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();

    const deletedSale = await getSaleById(sale.id);
    expect(deletedSale.deleteFl).toBe(1);

    const updateBasketItem = await getBasketItem(basketItem.id);
    expect(updateBasketItem.saleFk).toBeNull();
  });

  it('should render get sales page', async () => {
    const req = {};
    res.render = jest.fn();

    await saleController.getSalesPage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should render get add sale page', async () => {
    const req = {};
    res.render = jest.fn();

    await saleController.getAddSalePage(req, res);
    expect(res.render).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables(['sales', 'saleProducts', 'products', 'basketItems', 'purchaseBaskets']);
});
