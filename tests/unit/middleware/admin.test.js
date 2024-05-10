const { mockRequest } = require('mock-req-res');
const admin = require('../../../middleware/admin');
const { createTestAdminAccount } = require('../../helper/accountTestHelper');
const { createTwoFactorAuthForAccountId, complete2FaSetupForAccountId } = require('../../../utility/account/accountOperations');
const { truncateTables, setUpTestDb } = require('../../helper/generalTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('twoFa', () => {
  it('should proceed if twoFa session object set to true', () => {
    const req = mockRequest({
      body: { email: 'email', password: 'password' },
      session: { twoFa: true },
    });
    const res = jest.fn();
    const next = jest.fn();
    admin.twoFa(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should redirect to /admin/login if twoFa session object not true', () => {
    const req = mockRequest({
      body: { email: 'email', password: 'password' },
      session: { twoFa: false },
    });
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    admin.twoFa(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });
});

describe('twoFa2', () => {
  it('should redirect to /admin/login when attempt field in session has not be defined', () => {
    const req = mockRequest({
      session: {},
    });

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    admin.twoFa2(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should redirect to /admin/login when attempt field in session is greater than 1', () => {
    const req = mockRequest({
      session: { attempt: 2 },
    });

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    admin.twoFa2(req, res, next);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should proceed as normal when attempt field in session is equal to 1', () => {
    const req = mockRequest({
      session: { attempt: 0 },
    });

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    admin.twoFa2(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('setup2fa', () => {
  it('should redirect to /admin-dashboard when twoFactorAuth is not null and is authenticated', async () => {
    const account = await createTestAdminAccount();
    const secret = 'secret';
    const qrCode = 'qrCode';
    await createTwoFactorAuthForAccountId(account.id, secret, qrCode);
    await complete2FaSetupForAccountId(account.id, secret);
    const req = mockRequest({
      user: {
        id: account.id,
      },
      session: {},
    });

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    await admin.setup2fa(req, res, next);
    expect(req.session.message).toBe(undefined);
    expect(res.redirect).toHaveBeenCalled();
  });

  it('should redirect to /admin-dashboard when twoFactorAuth is not null and is not authenticated', async () => {
    const account = await createTestAdminAccount();
    const secret = 'secret';
    const qrCode = 'qrCode';
    const password = 'password';

    await createTwoFactorAuthForAccountId(account.id, secret, qrCode);

    const req = mockRequest({
      user: {
        id: account.id,
        email: account.email,
      },
      body: {
      },
      session: {
        password,
      },
    });

    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();

    await admin.setup2fa(req, res, next);
    expect(req.body.email).toBe(account.email);
    expect(req.body.password).toBe(password);
    expect(next).toHaveBeenCalled();
  });
});

afterEach(async () => {
  await truncateTables(['accounts', 'twoFactorAuths']);
});
