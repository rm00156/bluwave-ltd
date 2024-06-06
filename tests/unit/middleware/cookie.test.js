const { mockRequest } = require('mock-req-res');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');
const cookie = require('../../../middleware/cookie');
const accountOperations = require('../../../utility/account/accountOperations');

beforeAll(async () => {
  await setUpTestDb();
});

const spyByEmail = jest.spyOn(accountOperations, 'findAccountByEmail');
const spyById = jest.spyOn(accountOperations, 'findAccountById');

function getTomorrowDate() {
  const today = new Date(); // Get the current date

  // Add one day to the current date
  today.setDate(today.getDate() + 1);

  return today;
}

describe('loginUsingCookie', () => {
  it('should return next with err if passport authentication fails', async () => {
    const account = await createTestCustomerAccount();
    const req = {
      body: {},
      cookies: {
        bluwave_ecommerce_user_data: {
          id: account.id,
        },
      },
    };

    const res = jest.fn();
    const next = jest.fn();
    spyByEmail.mockReturnValue(null);
    await cookie.loginUsingCookie(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return next with err if login fails', async () => {
    const account = await createTestCustomerAccount();
    const req = {
      body: {},
      cookies: {
        bluwave_ecommerce_user_data: {
          id: account.id,
        },
      },
    };

    const res = jest.fn();
    const next = jest.fn();
    spyById.mockReturnValueOnce(accountOperations.findAccountById);
    spyById.mockReturnValueOnce(null);
    await cookie.loginUsingCookie(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return next when login successful', async () => {
    spyById.mockRestore();
    spyByEmail.mockRestore();

    const next = jest.fn();
    const account = await createTestCustomerAccount();

    const logIn = jest.fn((user, callback) => {
      callback(null);
      expect(next).toHaveBeenCalled();
    });

    const req = {
      body: {},
      cookies: {
        bluwave_ecommerce_user_data: {
          id: account.id,
        },
      },
      logIn,
    };

    const res = jest.fn();

    await Promise.all([cookie.loginUsingCookie(req, res, next)]);
  });
});

describe('getUser', () => {
  it('should proceed to next when account is found and not guest', () => {
    const req = {
      user: {},
    };

    const res = jest.fn();
    const next = jest.fn();

    cookie.getUser(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should proceed to next when account is found and is guest and no cookie display message should be true', async () => {
    const req = mockRequest({
      user: {
        id: 1,
        guestFl: true,
      },
      body: {},
    });

    const res = jest.fn();
    const next = jest.fn();

    await cookie.getUser(req, res, next);
    expect(req.body.displayCookieMessage).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should proceed to next when account is found and is guest and cookie not accepted display message should be true', async () => {
    const account = await createTestCustomerAccount();
    const req = mockRequest({
      user: {
        id: account.id,
        guestFl: true,
      },
      body: {},
    });

    const res = jest.fn();
    const next = jest.fn();
    await accountOperations.createCookieForAccountId(account.id, Date.now());
    await cookie.getUser(req, res, next);
    expect(req.body.displayCookieMessage).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should proceed to next when account is found and is guest and cookie accepted display message should be false', async () => {
    const account = await createTestCustomerAccount();
    const req = mockRequest({
      user: {
        id: account.id,
        guestFl: true,
      },
      body: {},
    });

    const res = jest.fn();
    const next = jest.fn();

    const tomorrowDate = getTomorrowDate();
    const cookieObject = await accountOperations.createCookieForAccountId(account.id, tomorrowDate);
    await accountOperations.acceptCookie(cookieObject.id);
    await cookie.getUser(req, res, next);
    expect(req.body.displayCookieMessage).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});

describe('isCheckoutAsGuest', () => {
  it('should proceed if account is guest and session has checkoutAsGuestFl set to true', () => {
    const req = {
      user: {
        guestFl: true,
      },
      session: {
        checkoutAsGuestFl: true,
      },
    };

    const res = jest.fn();
    const next = jest.fn();

    cookie.isCheckoutAsGuest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should proceed if account is not a guest', () => {
    const req = {
      user: {
        guestFl: false,
      },
    };

    const res = jest.fn();
    const next = jest.fn();

    cookie.isCheckoutAsGuest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect if account is guest and checkoutAsGuesFl is false', () => {
    const req = {
      user: {
        guestFl: true,
      },
      session: {
        checkoutAsGuestFl: false,
      },
    };

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    cookie.isCheckoutAsGuest(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});

describe('isGuest', () => {
  it('should redirect when user is guest and checkoutAsGuestFl is true', () => {
    const req = {
      user: {
        guestFl: true,
      },
      session: {
        checkoutAsGuestFl: true,
      },
    };

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    cookie.isGuest(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should proceed when user is guest and checkoutAsGuestFl is false', () => {
    const req = {
      user: {
        guestFl: true,
      },
      session: {
        checkoutAsGuestFl: false,
      },
    };

    const res = jest.fn();
    const next = jest.fn();

    cookie.isGuest(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect when user is not guest', () => {
    const req = {
      user: {
        guestFl: false,
      },
    };

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    cookie.isGuest(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables(['accounts']);
});
