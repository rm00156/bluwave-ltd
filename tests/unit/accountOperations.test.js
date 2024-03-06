const Sequelize = require('sequelize');
const utiltyHelper = require('../../utilty/general/utilityHelper');
const accountOperations = require('../../utilty/account/accountOperations');

const model = require('../../models');

const accountIds = [];

beforeAll(async () => {
  await model.sequelize.sync();
});
describe('test creation of an account', () => {
  test('if email is not a valid error thrown', async () => {
    await expect(accountOperations.createAccount(2, 'reece', 'reece', 'fe', 'rer')).rejects.toThrow('SequelizeValidationError: Validation error: Validation isEmail on email failed');
  });

  test('account is created', async () => {
    const accountTypeId = 2;
    const email = 'reece@hotmail.co.uk';
    const name = 'reece';
    const phoneNumber = 'fe';
    const password = 'rer';

    const account = await accountOperations.createAccount(accountTypeId, email, name, phoneNumber, password);
    expect(account).not.toBeNull();
    accountIds.push(account.id);
    expect(account.name).toBe('reece');
    expect(account.email).toBe('reece@hotmail.co.uk');
    expect(account.accountTypeFk).toBe(2);
    expect(account.phoneNumber).toBe('fe');
    expect(utiltyHelper.validPassword(account, 'rer')).toBe(true);
  });
});

afterEach(async () => {
  await model.account.destroy({
    where: {
      id: {
        [Sequelize.Op.in]: accountIds,
      },
    },
  });
});
// })
