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

async function setUpAdminAccountAndAgent() {
  const email = 'email@email.com';
  const name = 'name';
  const phoneNumber = 'phoneNumber';
  const password = 'password';

  const adminAccountType = await getAdminAccountType();
  const adminAccount = await createAccount(
    adminAccountType.id,
    email,
    name,
    phoneNumber,
    password,
  );

  const response = await request(app)
    .post('/admin-login')
    .send({ email, password });
  const agent = request.agent(app);
  agent.set('Cookie', response.headers['set-cookie']);

  return { adminAccount, agent };
}

async function createTestCustomerAccount() {
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
  );

  return customerAccount;
}

// function closeRedisClientConnection() {
//   redisClient.quit();
// }

module.exports = {
  // closeRedisClientConnection,
  createTestCustomerAccount,
  deleteAccountById,
  setUpAdminAccountAndAgent,
};
