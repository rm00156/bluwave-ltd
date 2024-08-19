const validator = require('validator');
const logger = require('pino')();
const orderOperations = require('../utility/order/orderOperations');

function validatePhoneNumber(req, res) {
  const { phoneNumber } = req.query;
  const errors = [];
  if (
    phoneNumber === undefined
    || !validator.isLength(phoneNumber, { min: 11, max: 11 })
    || !validator.isNumeric(phoneNumber)
  ) {
    errors.push('Please enter a valid Phone Number');
    logger.info('Please use enter a valid Phone Number');
    return res.status(400).json({ errors });
  }

  return res.status(200).json({});
}

async function isCorrectAccount(req, res, next) {
  const purchaseBasketId = req.params.id;
  const purchaseBasket = await orderOperations.getPurchaseBasketWithIdAndAccountId(purchaseBasketId, req.user.id);

  if (purchaseBasket == null) {
    return res.redirect('/');
  }

  return next();
}

module.exports = {
  isCorrectAccount,
  validatePhoneNumber,
};
