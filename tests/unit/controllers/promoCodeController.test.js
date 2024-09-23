const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestProduct } = require('../../helper/productTestHelper');
const { createTestPromoCode } = require('../../helper/promoCodeTestHelper');
const { convertDateToString } = require('../../../utility/general/utilityHelper');
const { createOptionGroup, getAllQuantities } = require('../../../utility/products/productOperations');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');
const { createBasketItem, getBasketItem } = require('../../../utility/basket/basketOperations');
const { completePurchaseBasket } = require('../../../utility/order/orderOperations');

const { createTestPurchaseBasketForBasketItem } = require('../../helper/basketTestHelper');
const promoCodeController = require('../../../controllers/PromoCodeController');

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

describe('promo code controller', () => {
  it('should return errors if dates are not valid for getting product with no active promoCodes', async () => {
    const req = {
      params: {
        fromDt: '',
        toDt: '',
      },
    };

    const errors = {
      fromDt: 'Please enter valid date',
      toDt: 'Please enter valid date',
    };
    await promoCodeController.getProductWithNoActivePromoCodes(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return products with no active promoCodes', async () => {
    const req = {
      params: {
        fromDt: '2022-01-01',
        toDt: '2023-01-01',
      },
    };

    await promoCodeController.getProductWithNoActivePromoCodes(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('should return errors if dates are not valid for getting product with no active promoCodes for promo code', async () => {
    const req = {
      params: {
        fromDt: '',
        toDt: '',
      },
    };

    const errors = {
      fromDt: 'Please enter valid date',
      toDt: 'Please enter valid date',
    };
    await promoCodeController.getProductWithNoActivePromoCodesForPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return products with no active promoCodes for promo code', async () => {
    const req = {
      params: {
        id: 1,
        fromDt: '2022-01-01',
        toDt: '2023-01-01',
      },
    };

    await promoCodeController.getProductWithNoActivePromoCodesForPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('should render get promo codes page', async () => {
    const req = {
      user: {
        id: 1,
      },
    };

    res.render = jest.fn();

    await promoCodeController.getPromoCodesPage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should render get create promo code page', async () => {
    const req = {
      user: {
        id: 1,
      },
    };

    res.render = jest.fn();
    await promoCodeController.getCreatePromoCodePage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should return error when promo code input not valid', async () => {
    const req = {
      body: {
        code: 'co',
        promoCodeTypeId: '1',
        fromDt: '2023-01-01',
        toDt: '2024-01-01',
        maxUses: '1',
        description: 'description',
        percentage: '10',
        ids: '["1"]',
      },
    };

    const errors = {
      code: 'Please set a promo code between 3 and 50 characters in length.',
    };
    await promoCodeController.createPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return created promo code', async () => {
    const product = await createTestProduct(true, true);
    const req = {
      body: {
        code: 'code',
        promoCodeTypeId: '1',
        fromDt: '2023-01-01',
        toDt: '2024-01-01',
        maxUses: '1',
        description: 'description',
        percentage: '10',
        ids: `["${product.id}"]`,
      },
    };

    await promoCodeController.createPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: expect.any(Number) });

    req.body.maxUses = '';
    await promoCodeController.createPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: expect.any(Number) });
  });

  it('should render get promo code types page', async () => {
    const req = {};
    await promoCodeController.getPromoCodeTypes(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });

  it('should redirect to admin dashboard when promo code not found', async () => {
    const req = {
      params: {
        id: 0,
      },
    };

    res.redirect = jest.fn();
    await promoCodeController.getPromoCodePage(req, res);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should go to promo code page when promo code found', async () => {
    const { promoCode } = await createTestPromoCode();

    const req = {
      params: {
        id: promoCode.id,
      },
    };

    res.render = jest.fn();
    await promoCodeController.getPromoCodePage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should return product ids for promoCode', async () => {
    const { promoCode, product } = await createTestPromoCode();

    const req = {
      params: {
        id: promoCode.id,
      },
    };

    await promoCodeController.getPromoCodeProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ productIds: [product.id] });
  });

  it('should return error when promo code not found when updating promoCode', async () => {
    const req = {
      params: {
        id: 0,
      },
    };

    const error = {
      error: 'No promo code found',
    };

    await promoCodeController.updatePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  it('should return error when promo code validation fails when updating promoCode', async () => {
    const { promoCode, product } = await createTestPromoCode();

    const req = {
      params: {
        id: promoCode.id,
      },

      body: {
        code: '',
        promoCodeTypeId: '1',
        fromDt: '2023-01-01',
        toDt: '2024-01-01',
        maxUses: '1',
        description: 'description',
        percentage: '10',
        ids: `["${product.id}"]`,
      },
    };

    const error = {
      code: 'Please set a promo code between 3 and 50 characters in length.',
    };

    await promoCodeController.updatePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });

  it('should return error when update is the same as current promoCode when updating promoCode', async () => {
    const { promoCode, product } = await createTestPromoCode();
    const req = {
      params: {
        id: promoCode.id,
      },

      body: {
        code: promoCode.code,
        promoCodeTypeId: promoCode.promoCodeTypeFk,
        fromDt: convertDateToString(promoCode.fromDt),
        toDt: convertDateToString(promoCode.toDt),
        maxUses: promoCode.maxUses.toString(),
        description: promoCode.description,
        percentage: promoCode.percentage.toString(),
        ids: `["${product.id}"]`,
      },
    };

    await promoCodeController.updatePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: { noChange: true } });
  });

  it('should return updated promo code when updating promoCode', async () => {
    const { promoCode, product } = await createTestPromoCode();
    const req = {
      params: {
        id: promoCode.id,
      },

      body: {
        code: 'newCODE',
        promoCodeTypeId: promoCode.promoCodeTypeFk,
        fromDt: convertDateToString(promoCode.fromDt),
        toDt: convertDateToString(promoCode.toDt),
        maxUses: promoCode.maxUses.toString(),
        description: promoCode.description,
        percentage: promoCode.percentage.toString(),
        ids: `["${product.id}"]`,
      },
    };

    await promoCodeController.updatePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: expect.any(Number) });
  });

  it('should return error when no promo code to be removed from basket items', async () => {
    const req = {
      user: {
        id: 0,
      },
    };

    await promoCodeController.removePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'There is no promotional code to be removed' });
  });

  it('should return 200 status when promo code removed from basket items', async () => {
    const currentTestPromoCode = await createTestPromoCode();

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const subTotal = (parseFloat(price) * (1 - currentPromoCode.percentage / 100)).toFixed(2);
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      subTotal,
      null,
      currentPromoCode.id,
    );

    const req = {
      user: {
        id: account.id,
      },
    };

    await promoCodeController.removePromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    const updateBasketItem = await getBasketItem(basketItem.id);
    expect(updateBasketItem.promoCodeFk).toBeNull();
    expect(updateBasketItem.subTotal).toBe(price);
  });

  it('should return error when promo code entered is not valid', async () => {
    const req = {
      body: {
        code: '',
      },
    };

    await promoCodeController.applyPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'The promotional code you entered is not valid.' });
  });

  it('should return error when promo code type is first order and not accounts first order', async () => {
    const toDaysDate = convertDateToString(new Date());
    const { promoCode, product } = await createTestPromoCode(toDaysDate, toDaysDate, 10, null, 'FirstOrder');

    const price = '10.00';
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      price,
      null,
      null,
    );

    await createBasketItem(
      account.id,
      product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      price,
      null,
      null,
    );

    const deliveryType = 'Collection';
    const purchaseBasket = await createTestPurchaseBasketForBasketItem(
      basketItem.accountFk,
      deliveryType,
      Date.now(),
      basketItem.id,
    );
    await completePurchaseBasket(purchaseBasket.id, Date.now());

    const req = {
      user: {
        id: account.id,
      },
      body: {
        code: promoCode.code,
      },
    };

    await promoCodeController.applyPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'The promotional code you entered is not applicable to your basket.' });
  });

  it('should apply promo code when type is first order and is first order', async () => {
    const toDaysDate = convertDateToString(new Date());
    const { promoCode, product } = await createTestPromoCode(toDaysDate, toDaysDate, 10, null, 'FirstOrder');

    const price = '10.00';
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();

    await createBasketItem(
      account.id,
      product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      price,
      null,
      null,
    );

    const req = {
      user: {
        id: account.id,
      },
      body: {
        code: promoCode.code,
      },
    };

    await promoCodeController.applyPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return error when promo code does not apply to any items in basket', async () => {
    const product = await createTestProduct(true, true);
    const toDaysDate = convertDateToString(new Date());
    const currentTestPromoCode = await createTestPromoCode(toDaysDate, toDaysDate, 10, null);

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    await createBasketItem(account.id, product.id, optionGroup.id, null, quantity.id, price, price, null, null);

    const req = {
      user: {
        id: account.id,
      },

      body: {
        code: currentPromoCode.code,
      },
    };

    await promoCodeController.applyPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'The promotional code you entered is not applicable to your basket.' });
  });

  it('should return status 200 when promo code does apply to any items in basket', async () => {
    const toDaysDate = convertDateToString(new Date());
    const currentTestPromoCode = await createTestPromoCode(toDaysDate, toDaysDate, 10, null);

    const currentPromoCode = currentTestPromoCode.promoCode;
    const price = '10.00';
    const quantities = await getAllQuantities();
    const quantity = quantities[0];

    const account = await createTestCustomerAccount();

    const optionGroup = await createOptionGroup();
    const basketItem = await createBasketItem(
      account.id,
      currentTestPromoCode.product.id,
      optionGroup.id,
      null,
      quantity.id,
      price,
      price,
      null,
      null,
    );

    const req = {
      user: {
        id: account.id,
      },

      body: {
        code: currentPromoCode.code,
      },
    };

    await promoCodeController.applyPromoCode(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({});

    const updatedBasketItem = await getBasketItem(basketItem.id);
    expect(updatedBasketItem.promoCodeFk).toBe(currentPromoCode.id);
  });
});

afterEach(async () => {
  await truncateTables([
    'promoCodes',
    'promoCodeProducts',
    'products',
    'basketItems',
    'purchaseBaskets',
    'sales',
    'saleProducts',
  ]);
});
