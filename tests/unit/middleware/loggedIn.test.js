const { mockRequest } = require('mock-req-res');
const logggedIn = require('../../../middleware/loggedIn');

describe('isLoggedIn', () => {
  it('should proceed if user is defined', () => {
    const req = mockRequest({
      user: {},
    });
    const res = jest.fn();
    const next = jest.fn();
    logggedIn.isLoggedIn(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect to / if user is null', () => {
    const req = mockRequest({
      user: null,
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    logggedIn.isLoggedIn(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should redirect to / if user is undefined', () => {
    const req = mockRequest({});
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    logggedIn.isLoggedIn(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});
