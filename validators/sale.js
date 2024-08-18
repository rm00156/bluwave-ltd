const validator = require('validator');
const logger = require('pino')();
const { getSaleProductsForSaleId } = require('../utility/sales/salesOperations');
const utilityHelper = require('../utility/general/utilityHelper');

const validateDate = (fromDt, toDt) => {
  const errors = {};
  if (!validator.isDate(fromDt)) {
    errors.fromDt = 'Please enter valid date';
    logger.info('Please enter valid fromDt');
  }

  if (!validator.isDate(toDt)) {
    errors.toDt = 'Please enter valid date';
    logger.info('Please enter valid toDt');
  }

  if (!validator.isBefore(fromDt, toDt) && !validator.equals(fromDt, toDt)) {
    errors.fromDt = 'FromDt must be before ToDt';
    logger.info('FromDt must be before ToDt');
  }

  return errors;
};

const validateSale = (body) => {
  const {
    name, fromDt, toDt, description, percentage, ids,
  } = body;
  const errors = {};

  if (!validator.isLength(name, { min: 3, max: 50 })) {
    errors.name = 'Please enter name between 3 and 50 characters in length.';
    logger.info('Please use enter name between 3 and 50 characters in length.');
  }

  validateDate(fromDt, toDt, errors);

  if (!validator.isLength(description, { min: 1 })) {
    errors.description = 'Please set a description';
    logger.info('Please set a description');
  }

  if (!validator.isInt(percentage, { min: 1, max: 100 })) {
    errors.percentage = 'Please set a valid percentage';
    logger.info('Please set a valid percentage');
  }

  const productIds = JSON.parse(ids);
  if (productIds.length === 0) {
    errors.ids = 'Please select a product.';
    logger.info('Please select a product.');
  }

  return errors;
};

const hasSaleNotChanged = async (body, sale) => {
  const {
    name, fromDt, toDt, description, percentage, ids,
  } = body;

  const productIds = JSON.parse(ids);
  const saleProducts = await getSaleProductsForSaleId(sale.id);
  const saleProductIds = saleProducts.map((item) => item.productFk.toString());
  const same = utilityHelper.hasTheSameItems(productIds, saleProductIds);
  return (
    name === sale.name
    && fromDt === sale.fromDt
    && toDt === sale.toDt
    && description === sale.description
    && Number(percentage) === sale.percentage
    && same
  );
};

module.exports = {
  hasSaleNotChanged,
  validateDate,
  validateSale,
};
