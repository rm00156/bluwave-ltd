const checkoutValidator = require('../../../validators/checkout');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createPurchaseBasketForAccount } = require('../../helper/basketTestHelper');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('validate checkout', () => {
  it('should respond with a 400 error if no phone number set', () => {
    const req = {
      query: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const errors = [];
    errors.push('Please enter a valid Phone Number');

    checkoutValidator.validatePhoneNumber(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors });
  });

  it('should respond with a 400 error if phone number does not have length 11', () => {
    const req = {
      query: {
        phoneNumber: '34',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const errors = [];
    errors.push('Please enter a valid Phone Number');

    checkoutValidator.validatePhoneNumber(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors });
  });

  it('should respond with a 400 error if phone number is not have length numeric', () => {
    const req = {
      query: {
        phoneNumber: '3445612a451',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const errors = [];
    errors.push('Please enter a valid Phone Number');

    checkoutValidator.validatePhoneNumber(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors });
  });

  it('should respond with a 200 status phone number is valid', () => {
    const req = {
      query: {
        phoneNumber: '34456124451',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    checkoutValidator.validatePhoneNumber(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({});
  });

  it('should redirect to home if no purchase basket can be found for account', async () => {
    const req = {
      params: {
        id: 0,
      },
      user: {
        id: 0,
      },
    };
    const res = {
      redirect: jest.fn(),
    };

    const next = jest.fn();

    await checkoutValidator.isCorrectAccount(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should call next if purchase basket found with id for account', async () => {
    const account = await createTestCustomerAccount();
    const deliveryType = 'Collection';
    const purchaseBasket = await createPurchaseBasketForAccount(account.id, deliveryType);

    const req = {
      params: {
        id: purchaseBasket.id,
      },
      user: {
        id: account.id,
      },
    };
    const res = {
    };

    const next = jest.fn();
    await checkoutValidator.isCorrectAccount(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables(['purchaseBaskets', 'shippingDetails', 'accounts']);
});
