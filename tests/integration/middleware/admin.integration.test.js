const request = require('supertest');
const { truncateTables, setUpTestDb } = require('../../helper/generalTestHelper');
const {
  createTestCustomerAccount, createTestAdminAccount, setUpCustomerAccountAndAgent, setUpAdminAccountAndAgent,
} = require('../../helper/accountTestHelper');
const { createTwoFactorAuthForAccountId, complete2FaSetupForAccountId } = require('../../../utility/account/accountOperations');
const { app } = require('../../../app');
const admin = require('../../../middleware/admin');

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  await setUpTestDb();

  // const customerSetup = await setUpCustomerAccountAndAgent();
  // agent = customerSetup.agent;
}, 60000);

describe('is admin', () => {
  it('should redirect to /login if not login in user', async () => {
    const response = await request(app).get('/admin-dashboard');
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/login');
  });

  it('should redirect to /login if logged in customer', async () => {
    const { agent } = await setUpCustomerAccountAndAgent();
    const response = await agent.get('/admin-dashboard');
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/login');
  });
});

describe('admin require 2fa setup', () => {
  it('should redirect to /setup-2fa if twoFactorAuth doesnt exist', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const { agent } = await setUpAdminAccountAndAgent();
    const response = await agent.get('/admin-dashboard');
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/setup-2fa');
  });

  it('should redirect to /setup-2fa if twoFactorAuth exist and is not authenticated', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const { agent, adminAccount } = await setUpAdminAccountAndAgent();

    const secret = 'secret';
    const qrCode = 'qrCode';
    await createTwoFactorAuthForAccountId(adminAccount.id, secret, qrCode);
    const response = await agent.get('/admin-dashboard');
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/setup-2fa');
  });

  it('should proceed if twoFactorAuth exist and is authenticated', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const { agent, adminAccount } = await setUpAdminAccountAndAgent();

    const secret = 'secret';
    const qrCode = 'qrCode';
    await createTwoFactorAuthForAccountId(adminAccount.id, secret, qrCode);
    await complete2FaSetupForAccountId(adminAccount.id, secret);
    const response = await agent.get('/admin-dashboard');
    expect(response.status).toBe(200);
  });

  it('should redirect to /admin/login/step-two if 2fa authenticated', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const { agent, adminAccount } = await setUpAdminAccountAndAgent();

    const secret = 'secret';
    const qrCode = 'qrCode';
    await createTwoFactorAuthForAccountId(adminAccount.id, secret, qrCode);
    await complete2FaSetupForAccountId(adminAccount.id, secret);
    const response = await agent.get('/admin-dashboard');
    expect(response.status).toBe(200);
  });
});

describe('is login require 2fa code', () => {
  it('should redirect to UserNotFound if account not found for email', async () => {
    const response = await request(app).post('/admin-login').send({ email: 'email' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/admin/login?error=UserNotFound');
  });

  it('should redirect to UserNotFound if not admin account', async () => {
    const account = await createTestCustomerAccount();
    const response = await request(app).post('/admin-login').send({ email: account.email });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/admin/login?error=UserNotFound');
  });

  it('should redirect to UserNotFound if password does not match admin account', async () => {
    const adminAccount = await createTestAdminAccount();
    const response = await request(app).post('/admin-login').send({ email: adminAccount.email, password: 'notPassword' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/admin/login?error=UserNotFound');
  });

  it('should login if twoFactorAuth not set up', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const adminAccount = await createTestAdminAccount();
    const response = await request(app).post('/admin-login').send({ email: adminAccount.email, password: 'password' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/admin-dashboard');
  });

  it('should redirect to /admin/login/step-two if twoFactorAuth authenticated', async () => {
    jest.spyOn(admin, 'notProduction').mockReturnValue(false);
    const adminAccount = await createTestAdminAccount();
    const secret = 'secret';
    const qrCode = 'qrCode';
    await createTwoFactorAuthForAccountId(adminAccount.id, secret, qrCode);
    await complete2FaSetupForAccountId(adminAccount.id, secret);
    const response = await request(app).post('/admin-login').send({ email: adminAccount.email, password: 'password' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/admin/login/step-two');
  });
});

afterEach(async () => {
  await truncateTables(['accounts', 'twoFactorAuths']);
});

afterAll(() => {
  process.env.NODE_ENV = 'test';
});
