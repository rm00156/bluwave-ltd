const request = require('supertest');

const { account } = require('../../models');
const { app /* redisClient */ } = require('../../app');
const {
  createAccount, getAdminAccountType, getCustomerAccountType, getAllCustomerAccounts,
} = require('../../utility/account/accountOperations');

async function deleteAccountById(id) {
  await account.destroy({
    where: {
      id,
    },
  });
}

async function createTestAdminAccount() {
  const email = 'email@email.com';
  const name = 'name';
  const phoneNumber = 'phoneNumber';
  const password = 'password';

  const adminAccountType = await getAdminAccountType();
  return createAccount(
    adminAccountType.id,
    email,
    name,
    phoneNumber,
    password,
  );
}

async function setUpAdminAccountAndAgent() {
  const adminAccount = await createTestAdminAccount();

  const response = await request(app)
    .post('/admin-login')
    .send({ email: adminAccount.email, password: 'password' });
  const agent = request.agent(app);
  agent.set('Cookie', response.headers['set-cookie']);

  return { adminAccount, agent };
}

async function createTestCustomerAccountWithEmail(email) {
  const name = 'name';
  const phoneNumber = 'phoneNumber';
  const password = 'password';
  const customerAccountType = await getCustomerAccountType();

  const customerAccount = await createAccount(
    customerAccountType.id,
    email,
    name,
    phoneNumber,
    password,
  );

  return customerAccount;
}

async function createTestCustomerAccount(date, guestFl) {
  const allCustomerAccounts = await getAllCustomerAccounts();
  const email = `customer_email${allCustomerAccounts.length + 1}@email.com`;
  const name = 'name';
  const phoneNumber = 'phoneNumber';
  const password = 'password';
  const customerAccountType = await getCustomerAccountType();

  const customerAccount = await createAccount(
    customerAccountType.id,
    email,
    name,
    phoneNumber,
    password,
    date,
    guestFl,
  );

  return customerAccount;
}

async function setUpCustomerAccountAndAgent() {
  const customerAccount = await createTestCustomerAccount();

  const response = await request(app)
    .post('/login')
    .send({ email: customerAccount.email, password: customerAccount.password });
  const agent = request.agent(app);
  agent.set('Cookie', response.headers['set-cookie']);

  return { customerAccount, agent };
}

// function closeRedisClientConnection() {
//   redisClient.quit();
// }

module.exports = {
  // closeRedisClientConnection,
  createTestAdminAccount,
  createTestCustomerAccount,
  createTestCustomerAccountWithEmail,
  deleteAccountById,
  setUpAdminAccountAndAgent,
  setUpCustomerAccountAndAgent,
};
