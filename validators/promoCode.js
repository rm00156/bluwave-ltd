const logger = require('pino')();
const validator = require('validator');
const utilityHelper = require('../utility/general/utilityHelper');

const { validateDate } = require('./sale');
const { getPromoCodeTypeById, getPromoCodeProductsForPromoCodeId } = require('../utility/promoCode/promoCodeOperations');

const validatePromoCode = async (body) => {
  const {
    code, promoCodeTypeId, fromDt, toDt, maxUses, description, percentage, ids,
  } = body;

  const errors = {};

  const promoCodeType = await getPromoCodeTypeById(promoCodeTypeId);
  if (promoCodeType === null) {
    errors.promoCodeType = 'Please select a valid promo code type';
    logger.info('Please select a valid promo code type');
  }

  if (maxUses !== '' && !validator.isInt(maxUses, { min: 1 })) {
    errors.maxUses = 'Max uses must either be not set or be a number greater than 0.';
    logger.info('Max uses must either be not set or be a number greater than 0.');
  }

  validateDate(fromDt, toDt, errors);

  if (!validator.isLength(description, { min: 1 })) {
    errors.description = 'Please set a description';
    logger.info('Please set a description');
  }

  if (!validator.isLength(code, { min: 3, max: 50 })) {
    errors.code = 'Please set a promo code between 3 and 50 characters in length.';
    logger.info('Please set a promo code between 3 and 50 characters in length.');
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

const isNumberFieldSame = (fieldName, fieldValue, promoCode) => {
  if (fieldValue === '' && promoCode[fieldName] === null) return true;

  if (Number(fieldValue) === Number(promoCode[fieldName])) return true;

  return false;
};

const hasPromoCodeNotChanged = async (body, promoCode) => {
  const {
    code, promoCodeTypeId, fromDt, toDt, maxUses, description, percentage, ids,
  } = body;

  const productIds = JSON.parse(ids);
  const promoCodeProducts = await getPromoCodeProductsForPromoCodeId(promoCode.id);
  const promoCodeProductIds = promoCodeProducts.map((item) => item.productFk.toString());
  const same = utilityHelper.hasTheSameItems(productIds, promoCodeProductIds);
  return (
    code === promoCode.code
    && fromDt === promoCode.fromDt
    && toDt === promoCode.toDt
    && description === promoCode.description
    && isNumberFieldSame('percentage', percentage, promoCode)
    && Number(maxUses) === Number(promoCode.maxUses)
    && Number(promoCodeTypeId) === Number(promoCode.promoCodeTypeFk)
    && same
  );
};
module.exports = {
  hasPromoCodeNotChanged,
  isNumberFieldSame,
  validatePromoCode,
};
