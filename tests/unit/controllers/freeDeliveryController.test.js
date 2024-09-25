const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

const freeDeliveryController = require('../../../controllers/FreeDeliveryController');
const { createFreeDelivery, getFreeDelivery } = require('../../../utility/delivery/deliveryOperations');

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

describe('free delivery controller', () => {
  it('should render free delivery page', async () => {
    const req = {
      user: {},
    };
    res.render = jest.fn();

    await freeDeliveryController.getFreeDeliveryPage(req, res);
    expect(res.render).toHaveBeenCalled();
  });

  it('should return status 200 and delete free delivery when status is false', async () => {
    const req = {
      body: {
        status: 'false',
      },
    };

    await createFreeDelivery(5.0);
    await freeDeliveryController.setFreeDelivery(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    const deletedFreeDelivery = await getFreeDelivery();

    expect(deletedFreeDelivery).toBeNull();
  });

  it('should return status 400 when status is true and spend over is not valid number', async () => {
    const req = {
      body: {
        status: 'true',
        spendOver: 'a',
      },
    };

    const errors = {
      spendOver: 'Please enter a valid amount above 1',
    };

    await freeDeliveryController.setFreeDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(errors);
  });

  it('should return status 200 when status is true and spend over is valid when no free delivery exists', async () => {
    const req = {
      body: {
        status: 'true',
        spendOver: '500.00',
      },
    };

    await freeDeliveryController.setFreeDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({});

    const freeDelivery = await getFreeDelivery();
    expect(freeDelivery.spendOver).toBe(req.body.spendOver);
  });

  it('should return status 200 when status is true and spend over is valid when a free delivery exists', async () => {
    const req = {
      body: {
        status: 'true',
        spendOver: '500.00',
      },
    };

    await createFreeDelivery('200.00');

    await freeDeliveryController.setFreeDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({});

    const updateFreeDelivery = await getFreeDelivery();
    expect(updateFreeDelivery.spendOver).toBe(req.body.spendOver);
  });
});

afterEach(async () => {
  await truncateTables(['freeDeliveries']);
});
