const signupValidator = require('../../../validators/signup');
const { createTestCustomerAccountWithEmail } = require('../../helper/accountTestHelper');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('validate create user fields', () => {
  it('should return errors object with name populated', () => {
    const req = {
      body: {
        name: 'ab',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('name');
  });

  it('should return errors object with email populated', () => {
    const req = {
      body: {
        email: 'ab',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('email');
  });

  it('should return errors object with password populated when contains ascii', () => {
    const req = {
      body: {
        password: 'こんにちは',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('password');
  });

  it('should return errors object with password populated when length less than 5', () => {
    const req = {
      body: {
        password: '123',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('password');
  });

  it('should return errors object with phoneNumber populated when length not 11', () => {
    const req = {
      body: {
        phoneNumber: '123',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('phoneNumber');
  });

  it('should return errors object with phoneNumber populated when not a number', () => {
    const req = {
      body: {
        phoneNumber: 'a1234567891',
      },
    };

    const errors = signupValidator.validateCreateUserFields(req);
    expect(errors).toHaveProperty('phoneNumber');
  });

  describe('validate user', () => {
    it('should return errors object with no fields', async () => {
      const req = {
        body: {
          name: 'name',
          email: 'email@email.com',
          password: 'password',
          phoneNumber: '12345678910',
        },
      };

      const errors = await signupValidator.validateUser(req);
      expect(errors).toEqual({});
    });

    it('should return errors object with email field populated', async () => {
      const email = 'email@email.com';
      await createTestCustomerAccountWithEmail(email);
      const req = {
        body: {
          name: 'name',
          email,
          password: 'password',
          phoneNumber: '12345678910',
        },
      };

      const errors = await signupValidator.validateUser(req);
      expect(errors).toHaveProperty('email');
    });
  });
});

afterEach(async () => {
  await truncateTables([
    'accounts',
  ]);
});
