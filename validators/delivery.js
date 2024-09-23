const validator = require('validator');
const logger = require('pino')();

const validateDeliveryOptions = (body) => {
  const errors = {};
  const {
    standardPrice, expressPrice, collectionWorkingDays, standardWorkingDays, expressWorkingDays,
  } = body;

  if (!validator.isInt(standardWorkingDays, { min: 1, max: 30 })) {
    errors.standardWorkingDays = 'Please set to a value between 1 and 30';
    logger.info('Please set to a value between 1 and 30');
  }

  if (!validator.isInt(collectionWorkingDays, { min: 1, max: 30 })) {
    errors.collectionWorkingDays = 'Please set to a value between 1 and 30';
    logger.info('Please set to a value between 1 and 30');
  }

  if (!validator.isInt(expressWorkingDays, { min: 1, max: 30 })) {
    errors.expressWorkingDays = 'Please set to a value between 1 and 30';
    logger.info('Please set to a value between 1 and 30');
  }

  if (!validator.isDecimal(expressPrice)) {
    errors.expressPrice = 'Please enter a valid price';
    logger.info('Please enter a valid price');
  }

  if (!validator.isDecimal(standardPrice)) {
    errors.standardPrice = 'Please enter a valid price';
    logger.info('Please enter a valid price');
  }

  return errors;
};

module.exports = {
  validateDeliveryOptions,
};
