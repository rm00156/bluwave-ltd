const { mockRequest } = require('mock-req-res');
const customer = require('../../../middleware/customer');

describe('isCustomer', () => {
  it('should proceed if accountTypeFk is 2', () => {
    const req = mockRequest({
      user: {
        accountTypeFk: 2,
      },
    });
    const res = jest.fn();
    const next = jest.fn();
    customer.isCustomer(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect to /admin-dashboard accountTypeFk is not 2', () => {
    const req = mockRequest({
      user: {
        accountTypeFk: 1,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    customer.isCustomer(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});

describe('isNotGuest', () => {
  it('should proceed if guestFl is false', () => {
    const req = mockRequest({
      user: {
        guestFl: false,
      },
    });
    const res = jest.fn();
    const next = jest.fn();
    customer.isNotGuest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect to home page if guestFl is true', () => {
    const req = mockRequest({
      user: {
        guestFl: true,
      },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    customer.isNotGuest(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});
