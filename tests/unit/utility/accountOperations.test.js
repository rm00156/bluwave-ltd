const bcrypt = require('bcrypt');
const { pauseForTimeInSecond, validPassword } = require('../../../utility/general/utilityHelper');
const accountOperations = require('../../../utility/account/accountOperations');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestCustomerAccount, setUpAdminAccountAndAgent } = require('../../helper/accountTestHelper');

const accountIds = [];

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('test creation of an account', () => {
  it('if email is not a valid error thrown', async () => {
    await expect(accountOperations.createAccount(2, 'test', 'test', 'fe', 'rer')).rejects.toThrow(
      'SequelizeValidationError: Validation error: Validation isEmail on email failed',
    );
  });

  it('account is created', async () => {
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
    expect(validPassword(account, 'rer')).toBe(true);
  });
});

test('get forgotten password by token and id', async () => {
  const account = await createTestCustomerAccount();
  const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
  await pauseForTimeInSecond(1);
  const getForgottenToken = await accountOperations.getForgottenPasswordByToken(forgottenPassword.token);
  expect(getForgottenToken).not.toBeNull();

  const getForgottenId = await accountOperations.findForgottenPasswordById(forgottenPassword.id);
  expect(getForgottenId).not.toBeNull();
});

test('create forgotten password request when one has already been made and is active', async () => {
  const account = await createTestCustomerAccount();
  const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
  await pauseForTimeInSecond(1);
  const secondForgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
  expect(secondForgottenPassword.id).toBe(forgottenPassword.id);
});

test('update forgotten password to used', async () => {
  const account = await createTestCustomerAccount();
  const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
  expect(forgottenPassword.usedFl).toBe(false);

  await accountOperations.updateForgottenPasswordAsUsed(forgottenPassword.id);
  const updatedForgottenPassword = await accountOperations.findForgottenPasswordById(forgottenPassword.id);
  expect(updatedForgottenPassword.usedFl).toBe(true);
});

test('delete all notifications for account', async () => {
  const account = await createTestCustomerAccount();
  await accountOperations.createNotification(account.id, 'link', 'text');

  const notificationsBefore = await accountOperations.getNotificationsForAccount(account.id);
  expect(notificationsBefore.length).toBe(1);

  await accountOperations.deleteAllNotificationsForAccount(account.id);
  const notificationsAfter = await accountOperations.getNotificationsForAccount(account.id);
  expect(notificationsAfter.length).toBe(0);
});

test('delete notification by id', async () => {
  const account = await createTestCustomerAccount();
  const notification = await accountOperations.createNotification(account.id, 'link', 'text');
  const notificationsBefore = await accountOperations.getNotificationsForAccount(account.id);
  expect(notificationsBefore.length).toBe(1);

  await accountOperations.deleteNotificationById(notification.id);
  const notificationsAfter = await accountOperations.getNotificationsForAccount(account.id);
  expect(notificationsAfter.length).toBe(0);
});

test('create notification for admin accounts', async () => {
  const { adminAccount } = await setUpAdminAccountAndAgent();
  const notificationsBefore = await accountOperations.getNotificationsForAccount(adminAccount.id);
  expect(notificationsBefore.length).toBe(0);

  await accountOperations.createNotificationForAdminAccounts('text', 'link');

  accountOperations.getNotificationsForAccount(adminAccount.id);
  const notificationsAfter = await accountOperations.getNotificationsForAccount(adminAccount.id);
  expect(notificationsAfter.length).toBe(1);
});

test('get notifications for account with limit', async () => {
  const account = await createTestCustomerAccount();
  await accountOperations.createNotification(account.id, 'link', 'text');
  await accountOperations.createNotification(account.id, 'link', 'text');

  const notifications = await accountOperations.getNotificationsForAccount(account.id, 1);
  expect(notifications.length).toBe(1);
});

test('get cookie for account', async () => {
  const account = await createTestCustomerAccount();
  const cookie = await accountOperations.createCookieForAccountId(account.id, Date.now());

  const getCookie = await accountOperations.getCookie(account.id);
  expect(getCookie).not.toBeNull();
  expect(getCookie.id).toBe(cookie.id);
});

describe('get account by id', () => {
  it('should return null if no account', async () => {
    const account = await accountOperations.getAccountById(0);
    expect(account).toBeNull();
  });

  it('should return account if exists', async () => {
    const account = await createTestCustomerAccount();
    const getAccount = await accountOperations.getAccountById(account.id);
    expect(getAccount).not.toBeNull();
  });
});

test('update account', async () => {
  const account = await createTestCustomerAccount();
  const newEmail = 'newEmail@email.com';
  const newPassword = 'newPassword';
  const newName = 'newName';
  const newPhoneNumber = 'newPhoneNumber';
  const guestFl = true;
  const deleteFl = true;
  await accountOperations.updateAccount(
    account.id,
    newEmail,
    newPassword,
    newName,
    newPhoneNumber,
    account.accountTypeFk,
    guestFl,
    deleteFl,
  );

  const updatedAccount = await accountOperations.getAccountById(account.id);
  expect(updatedAccount.email).toBe(newEmail);
  const isPasswordMatch = bcrypt.compareSync(newPassword, updatedAccount.password);

  expect(isPasswordMatch).toBe(true);
  expect(updatedAccount.name).toBe(newName);
  expect(updatedAccount.phoneNumber).toBe(newPhoneNumber);
  expect(updatedAccount.guestFl).toBe(guestFl ? 1 : 0);
  expect(updatedAccount.deleteFl).toBe(deleteFl ? 1 : 0);
});

test('delete active cookie for account', async () => {
  const account = await createTestCustomerAccount();
  await accountOperations.createCookieForAccountId(account.id, Date.now() + 100000);
  await accountOperations.deleteActiveCookieForAccount(account.id);
  const getCookie = await accountOperations.getCookie(account.id);
  expect(getCookie).toBeNull();
});

test('accept cookie', async () => {
  const account = await createTestCustomerAccount();
  const cookie = await accountOperations.createCookieForAccountId(account.id, Date.now() + 100000);

  await accountOperations.acceptCookie(cookie.id);
  const acceptedCookie = await accountOperations.getCookie(account.id);
  expect(acceptedCookie).not.toBeNull();
  expect(acceptedCookie.acceptedFl).toBe(true);
});

describe('get new customers in the last week', () => {
  it('should return 1 customer in the last week', async () => {
    await createTestCustomerAccount();

    const numberOfCustomers = await accountOperations.getNewCustomersInTheLastWeek();
    expect(numberOfCustomers).toBe(1);
  });

  it('should return 0 customers in the last week', async () => {
    const today = new Date();
    const daysAgo = 10;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const pastDate = new Date(today.getTime() - (millisecondsPerDay * daysAgo));
    await createTestCustomerAccount(pastDate);
    const numberOfCustomers = await accountOperations.getNewCustomersInTheLastWeek();
    expect(numberOfCustomers).toBe(0);
  });
});

test('get forgotten password by id', async () => {
  const account = await createTestCustomerAccount();
  const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
  await pauseForTimeInSecond(1);
  const getForgottenPassword = await accountOperations.getForgottenPasswordById(forgottenPassword.id);
  expect(getForgottenPassword).not.toBeNull();
});

describe('get forgotten password', () => {
  it('should return forgotton password when account id and token match', async () => {
    const account = await createTestCustomerAccount();
    const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
    await pauseForTimeInSecond(1);
    const getForgottenPassword = await accountOperations.getForgottenPassword(account.id, forgottenPassword.token);
    expect(getForgottenPassword).not.toBeNull();
    expect(getForgottenPassword.id).toBe(forgottenPassword.id);
  });

  it('should return null when account id and token match', async () => {
    const account = await createTestCustomerAccount();
    await accountOperations.createForgottenPasswordRequest(account.id);
    await pauseForTimeInSecond(1);
    const getForgottenPassword = await accountOperations.getForgottenPassword(account.id, 'abc');
    expect(getForgottenPassword).toBeNull();
  });
});

test('delete account and reactivate', async () => {
  const account = await createTestCustomerAccount();
  expect(account).not.toBeNull();
  expect(account.deleteFl).toBe(false);

  await accountOperations.deleteAccount(account.id);
  const deleteAccount = await accountOperations.getAccountById(account.id);
  expect(deleteAccount.deleteFl).toBe(1);

  await accountOperations.reactivateAccount(account.id);
  const reactivatedAccount = await accountOperations.getAccountById(account.id);
  expect(reactivatedAccount.deleteFl).toBe(0);
});

test('update account password', async () => {
  const account = await createTestCustomerAccount();
  const newPassword = 'newPassword';

  await accountOperations.updatePassword(account.id, newPassword);
  const updatedAccount = await accountOperations.getAccountById(account.id);
  expect(validPassword(updatedAccount, newPassword)).toBe(true);
});

test('update account name and phone number', async () => {
  const account = await createTestCustomerAccount();
  const newName = 'newName';
  const newPhoneNumber = 'newPhoneNumber';

  await accountOperations.updateAccountNameAndPhoneNumber(account.id, newName, newPhoneNumber);
  const updatedAccount = await accountOperations.getAccountById(account.id);
  expect(updatedAccount.name).toBe(newName);
  expect(updatedAccount.phoneNumber).toBe(newPhoneNumber);
});

test('get all non guest accounts', async () => {
  await createTestCustomerAccount();
  await createTestCustomerAccount(undefined, true);

  const allNonGuestAccounts = await accountOperations.getAllNonGuestAccounts();
  expect(allNonGuestAccounts.length).toBe(1);
});

test('create two factor auth for account', async () => {
  const account = await createTestCustomerAccount();
  const secret = 'secret';
  const qrCode = 'qrCode';

  const twoFactorAuth = await accountOperations.createTwoFactorAuthForAccountId(account.id, secret, qrCode);
  expect(twoFactorAuth).not.toBeNull();
  expect(twoFactorAuth.secret).toBe(secret);
  expect(twoFactorAuth.qrCode).toBe(qrCode);
  expect(twoFactorAuth.authenticatedFl).toBe(false);
});

test('complete 2Fa setup for account id', async () => {
  const account = await createTestCustomerAccount();
  const secret = 'secret';
  const qrCode = 'qrCode';

  await accountOperations.createTwoFactorAuthForAccountId(account.id, secret, qrCode);
  await accountOperations.complete2FaSetupForAccountId(account.id, secret);

  const updatedTwoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
  expect(updatedTwoFactorAuth.authenticatedFl).toBe(true);
});

afterEach(async () => {
  await truncateTables(['accounts', 'forgottenPasswords', 'notifications', 'cookies', 'twoFactorAuths']);
});
