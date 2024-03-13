const request = require('supertest');
const models = require('../../models');
const { app } = require('../../app');
const accountOperations = require('../../utilty/account/accountOperations');

async function deleteAccountById(id) {
  await models.account.destroy({
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

  const adminAccountType = await accountOperations.getAdminAccountType();
  const adminAccount = await accountOperations.createAccount(
    adminAccountType.id,
    email,
    name,
    phoneNumber,
    password,
  );

  const response = await request(app)
    .post('/admin_login')
    .send({ email, password });
  const agent = request.agent(app);
  agent.set('Cookie', response.headers['set-cookie']);

  return { adminAccount, agent };
}

module.exports = {
  deleteAccountById,
  setUpAdminAccountAndAgent,
};
