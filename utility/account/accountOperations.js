const logger = require('pino')();
const Sequelize = require('sequelize');
const models = require('../../models');
const { generateNumberCode, dateXAmountFromNow, generateHash } = require('../general/utilityHelper');

async function getForgottenPasswordByToken(token) {
  const now = Date.now();

  return models.forgottenPassword.findOne({
    where: {
      token,
      deleteFl: false,
      usedFl: false,
      expirationDttm: {
        [Sequelize.Op.gt]: now,
      },
      createdDttm: {
        [Sequelize.Op.lt]: now,
      },
    },
  });
}

async function updateCookieExpirationDate(
  cookieId,
  expirationDttm,
  res,
  maxAge,
) {
  await models.cookie.update(
    {
      expirationDttm,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: cookieId,
      },
    },
  );

  res.clearCookie('bluwave_ecommerce_user_data');
  const userData = { id: cookieId };
  res.cookie('bluwave_ecommerce_user_data', userData, {
    httpOnly: true,
    maxAge,
  });
}

async function getActiveCookie(accountId) {
  return models.cookie.findOne({
    where: {
      accountFk: accountId,
      expirationDttm: {
        [Sequelize.Op.gt]: Date.now(), // Specify the field name and comparison operator
      },
    },
  });
}

async function createCookie(accountId, expires, res) {
  const expirationDttm = new Date(Date.now() + expires);

  const existingActiveCookie = await getActiveCookie(accountId);
  const userData = { id: accountId };
  if (existingActiveCookie === null) {
    res.cookie('bluwave_ecommerce_user_data', userData, {
      httpOnly: true,
      maxAge: expires,
    });
    return models.cookie.create({
      accountFk: accountId,
      createdDttm: Date.now(),
      expirationDttm,
      acceptedFl: false,
      deleteFl: false,
      versionNo: 1,
    });
  }
  await updateCookieExpirationDate(
    existingActiveCookie.id,
    expirationDttm,
    res,
    expires,
  );
  return getActiveCookie(accountId);
}

async function getNewAccountNumber() {
  const code = generateNumberCode();

  const account = await models.account.findOne({
    where: {
      accountNumber: code,
    },
  });

  if (account === null) return code;

  return getNewAccountNumber();
}

async function createAccount(
  accountTypeFk,
  email,
  name,
  phoneNumber,
  password,
) {
  const accountNumber = await getNewAccountNumber();
  const transaction = await models.sequelize.transaction();
  let account;
  try {
    account = await models.account.create({
      email,
      phoneNumber,
      password: generateHash(password),
      name,
      accountTypeFk,
      createdAt: Date.now(),
      accountNumber,
      guestFl: false,
      deleteFl: false,
      versionNo: 1,
    });
    await transaction.commit();
  } catch (err) {
    logger.error(err.message);
    await transaction.rollback();
    throw new Error(err);
  }

  return account;
}

async function createGuestAccount(res) {
  const accountNumber = await getNewAccountNumber();
  const transaction = await models.sequelize.transaction();
  let account;
  let email;
  try {
    account = await models.account.create({
      email: 'temp@temp.com',
      phoneNumber: '00000000000',
      password: generateHash(process.env.LOGIN_PASSWORD),
      name: 'temp',
      accountTypeFk: 2,
      createdAt: Date.now(),
      accountNumber,
      guestFl: true,
      deleteFl: false,
      versionNo: 1,
    });

    email = `temp${account.id}@temp.com`;
    await models.account.update(
      {
        email,
      },
      {
        where: {
          id: account.id,
        },
      },
    );

    await createCookie(account.id, 60000 * 60 * 24 * 7, res);
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    throw new Error('error with guest creation');
  }
  await transaction.commit();
  return email;
}

async function getCookie(accountId) {
  return models.cookie.findOne({
    where: {
      accountFk: accountId,
    },
  });
}

async function findAccountByEmail(email) {
  return models.account.findOne({
    where: {
      email,
      deleteFl: false,
    },
  });
}

async function findAccountById(id) {
  return models.account.findOne({
    where: {
      id,
      deleteFl: false,
    },
  });
}

async function getAccountById(id) {
  const result = await models.sequelize.query(
    'select a.*, at.accountType from accounts a '
      + ' inner join accountTypes at on a.accountTypeFk = at.id '
      + ' where a.id = :id ',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );

  if (result.length === 0) {
    return null;
  }
  return result[0];
}

async function complete2FaSetupForAccountId(accountId, secret) {
  const transaction = await models.sequelize.transaction();
  try {
    await models.twoFactorAuth.update(
      {
        authenticatedFl: true,
        versionNo: models.sequelize.literal('versionNo + 1'),
      },
      {
        where: {
          accountFk: accountId,
          secret,
        },
      },
    );
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    throw new Error('error with update of account secret');
  }
  await transaction.commit();
}

async function updateAccount(
  id,
  email,
  password,
  name,
  phoneNumber,
  accountTypeId,
  guestFl,
  deleteFl,
) {
  await models.account.update(
    {
      email,
      name,
      password: generateHash(password),
      accountTypeFk: accountTypeId,
      createdDttm: Date.now(),
      phoneNumber,
      guestFl,
      deleteFl,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id,
      },
    },
  );
}

async function deleteActiveCookieForAccount(accountId) {
  const cookie = await getActiveCookie(accountId);
  if (cookie != null) {
    await cookie.destroy();
  }
}

async function acceptCookie(cookieId) {
  await models.cookie.update(
    {
      acceptedFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: cookieId,
      },
    },
  );
}

async function getAllNonGuestAccounts() {
  return models.sequelize.query(
    'select at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt, a.* from accounts a '
      + ' inner join accountTypes at on a.accountTypeFk = at.id '
      + ' where a.guestFl is false ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getTwoFactorAuthForAccountId(accountId) {
  return models.twoFactorAuth.findOne({
    where: {
      accountFk: accountId,
      deleteFl: false,
    },
  });
}

async function createTwoFactorAuthForAccountId(accountId, secret, qrCode) {
  return models.twoFactorAuth.create({
    accountFk: accountId,
    secret,
    qrCode,
    authenticatedFl: false,
    deleteFl: false,
    versionNo: 1,
  });
}

async function updateAccountNameAndPhoneNumber(accountId, name, phoneNumber) {
  return models.account.update(
    {
      name,
      phoneNumber,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: accountId,
      },
    },
  );
}

async function updatePassword(accountId, password) {
  await models.account.update(
    {
      password: generateHash(password),
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: accountId,
      },
    },
  );
}

async function deleteAccount(accountId) {
  await models.account.update(
    {
      deleteFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: accountId,
      },
    },
  );
}

async function reactivateAccount(accountId) {
  await models.account.update(
    {
      deleteFl: false,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: accountId,
      },
    },
  );
}

async function createForgottenPasswordRequest(accountId) {
  const token = generateNumberCode();

  const forgottenPassword = await getForgottenPasswordByToken(token);
  if (forgottenPassword === null) {
    return models.forgottenPassword.create({
      accountFk: accountId,
      createdDttm: Date.now(),
      expirationDttm: dateXAmountFromNow(60 * 60 * 1000),
      usedFl: false,
      token,
      deleteFl: false,
      versionNo: 1,
    });
  }

  return createForgottenPasswordRequest(accountId);
}

async function getForgottenPassword(accountId, token) {
  const now = Date.now();
  return models.forgottenPassword.findOne({
    where: {
      token,
      accountFk: accountId,
      deleteFl: false,
      usedFl: false,
      expirationDttm: {
        [Sequelize.Op.gt]: now,
      },
      createdDttm: {
        [Sequelize.Op.lt]: now,
      },
    },
  });
}

async function updateForgottenPasswordAsUsed(forgettenPasswordId) {
  await models.forgottenPassword.update(
    {
      usedFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: forgettenPasswordId,
      },
    },
  );
}

async function getForgottenPasswordById(id) {
  const now = Date.now();
  return models.forgottenPassword.findOne({
    where: {
      id,
      deleteFl: false,
      usedFl: false,
      expirationDttm: {
        [Sequelize.Op.gt]: now,
      },
      createdDttm: {
        [Sequelize.Op.lt]: now,
      },
    },
  });
}

async function findForgottenPasswordById(id) {
  return models.forgottenPassword.findOne({
    where: {
      id,
      deleteFl: false,
    },
  });
}

async function getNewCustomersInTheLastWeek() {
  const result = await models.sequelize.query(
    'SELECT count(id) as count '
      + ' FROM accounts '
      + ' WHERE created_At >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK) '
      + ' and accountTypeFk = :accountTypeId ',
    {
      replacements: { accountTypeId: 2 },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  if (result.length === 0) return 0;

  return result[0].count;
}

async function getNotificationsForAccount(accountId, limit) {
  const query = {
    where: {
      accountFk: accountId,
      deleteFl: false,
    },
    order: [['createdDttm', 'DESC']],
  };

  if (limit) {
    query.limit = limit;
  }
  return models.notification.findAll(query);
}

async function getAllActiveAdminAccounts() {
  return models.account.findAll({
    where: {
      accountTypeFk: 1,
      deleteFl: false,
    },
  });
}

async function createNotification(accountFk, link, text) {
  return models.notification.create({
    accountFk,
    createdDttm: Date.now(),
    link,
    text,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createNotificationForAdminAccounts(text, link) {
  const accounts = await getAllActiveAdminAccounts();

  await Promise.all(
    accounts.map((account) => createNotification(account.id, link, text)),
  );
}

async function getNotificationById(id) {
  return models.notification.findOne({
    where: {
      id,
      deleteFl: false,
    },
  });
}

async function deleteNotification(notification) {
  if (notification != null) await notification.destroy();
}

async function deleteNotificationById(id) {
  const notification = await getNotificationById(id);

  await deleteNotification(notification);
}

async function deleteAllNotificationsForAccount(accountId) {
  const notifications = await getNotificationsForAccount(accountId);
  await Promise.all(
    notifications.map((notification) => deleteNotification(notification)),
  );
}

async function createAccountType(id, accountType) {
  return models.accountType.create({
    id,
    accountType,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getAdminAccountType() {
  return models.accountType.findOne({
    where: {
      id: 1,
    },
  });
}

async function getCustomerAccountType() {
  return models.accountType.findOne({
    where: {
      id: 2,
    },
  });
}

async function getAllAccountTypes() {
  return models.accountType.findAll();
}

async function getAllCustomerAccounts() {
  return models.account.findAll({
    where: {
      accountTypeFk: 2,
    },
  });
}

module.exports = {
  getAdminAccountType,
  createAccountType,
  updateAccount,
  complete2FaSetupForAccountId,
  findAccountById,
  findAccountByEmail,
  getNewAccountNumber,
  createCookie,
  getCookie,
  createGuestAccount,
  createAccount,
  getActiveCookie,
  deleteActiveCookieForAccount,
  acceptCookie,
  getAllNonGuestAccounts,
  getAccountById,
  getTwoFactorAuthForAccountId,
  createTwoFactorAuthForAccountId,
  updateAccountNameAndPhoneNumber,
  updatePassword,
  deleteAccount,
  createForgottenPasswordRequest,
  getForgottenPassword,
  getForgottenPasswordById,
  findForgottenPasswordById,
  updateForgottenPasswordAsUsed,
  getNewCustomersInTheLastWeek,
  getNotificationsForAccount,
  createNotificationForAdminAccounts,
  deleteNotificationById,
  deleteAllNotificationsForAccount,
  getNotificationById,
  reactivateAccount,
  getAllAccountTypes,
  getCustomerAccountType,
  getAllCustomerAccounts,
};
