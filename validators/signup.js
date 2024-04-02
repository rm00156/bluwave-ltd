const validator = require('validator');
const logger = require('pino')();
const accountOperations = require('../utility/account/accountOperations');

function validateCreateUserFields(req) {
  const errors = {};
  if (
    req.body.name !== undefined
    && !validator.isLength(req.body.name, { min: 3, max: 50 })
  ) {
    errors.name = 'Please enter name between 3 and 50 characters in length.';
    logger.info('Please use enter name between 3 and 50 characters in length.');
  }

  if (req.body.email !== undefined && !validator.isEmail(req.body.email)) {
    errors.email = 'Please use a valid email address';
    logger.info('Please use a valid email address');
  }

  if (
    req.body.password !== undefined
    && !validator.isAscii(req.body.password)
  ) {
    errors.password = 'Invalid characters in password';
    logger.info('Invalid characters in password');
  }
  if (
    req.body.password !== undefined
    && !validator.isLength(req.body.password, { min: 5, max: 25 })
  ) {
    errors.password = 'Please ensure that the password length is at least 5 characters long and no more than 25';
    logger.info(
      'Please ensure that the password length is at least 5 characters long and no more than 25',
    );
  }

  if (
    req.body.phoneNumber !== undefined
    && !validator.isLength(req.body.phoneNumber, { min: 11, max: 11 })
  ) {
    errors.phoneNumber = 'Please enter a valid Phone Number';
    logger.info('Please use enter a valid Phone Number');
  }

  if (
    req.body.phoneNumber !== undefined
    && !validator.isNumeric(req.body.phoneNumber)
  ) {
    errors.phoneNumber = 'Please use enter a valid Phone Number';
    logger.info('Please use enter a valid Phone Number');
  }

  return errors;
}

async function validateUser(req) {
  const errors = validateCreateUserFields(req);
  const account = await accountOperations.findAccountByEmail(req.body.email);
  if (account !== null) {
    // user already exists
    errors.email = 'An account with this email already exists. Please log in';
    logger.info(
      'An account with this email already exists. Please log in',
    );
  }

  return errors;
}

module.exports = {
  validateCreateUserFields,
  validateUser,
};
