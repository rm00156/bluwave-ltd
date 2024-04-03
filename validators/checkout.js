const validator = require('validator');
const logger = require('pino')();
const orderOperations = require('../utility/order/orderOperations');

function validatePhoneNumber(req, res) {
  const { phoneNumber } = req.query;
  const errors = [];
  if (
    phoneNumber !== undefined
    && !validator.isLength(phoneNumber, { min: 11, max: 11 })
  ) {
    errors.push('Please enter a valid Phone Number');
    logger.info('Please use enter a valid Phone Number');
  }

  if (phoneNumber !== undefined && !validator.isNumeric(phoneNumber)) {
    errors.push('Please use enter a valid Phone Number');
    logger.info('Please use enter a valid Phone Number');
  }

  res.status(200).json({ errors });
}

async function isCorrectAccount(req, res, next) {
  const purchaseBasketId = req.params.id;
  const purchaseBasket = await orderOperations.getPurchaseBasketWithIdAndAccountId(
    purchaseBasketId,
    req.user.id,
  );

  if (purchaseBasket == null) {
    return res.redirect('/');
  }

  return next();
}

module.exports = {
  isCorrectAccount,
  validatePhoneNumber,
};
