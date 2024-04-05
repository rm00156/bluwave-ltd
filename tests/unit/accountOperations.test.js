const utiltyHelper = require('../../utility/general/utilityHelper');
const accountOperations = require('../../utility/account/accountOperations');
const { setUpTestDb, truncateTables } = require('../helper/generalTestHelper');

const accountIds = [];

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('test creation of an account', () => {
  test('if email is not a valid error thrown', async () => {
    await expect(accountOperations.createAccount(2, 'test', 'test', 'fe', 'rer')).rejects.toThrow('SequelizeValidationError: Validation error: Validation isEmail on email failed');
  });

  test('account is created', async () => {
    const accountTypeId = 2;
    const email = 'test@hotmail.co.uk';
    const name = 'test';
    const phoneNumber = 'fe';
    const password = 'rer';

    const account = await accountOperations.createAccount(accountTypeId, email, name, phoneNumber, password);
    expect(account).not.toBeNull();
    accountIds.push(account.id);
    expect(account.name).toBe('test');
    expect(account.email).toBe('test@hotmail.co.uk');
    expect(account.accountTypeFk).toBe(2);
    expect(account.phoneNumber).toBe('fe');
    expect(utiltyHelper.validPassword(account, 'rer')).toBe(true);
  });
});

afterEach(async () => {
  await truncateTables(['accounts']);
});
