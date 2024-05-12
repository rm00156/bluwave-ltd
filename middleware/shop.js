const basketOperations = require('../utility/basket/basketOperations');

async function isValidEditSession(req, res, next) {
  const { edit } = req.query;
  if (!edit) {
    return next();
  }

  const basketItem = await basketOperations.getBasketItem(edit);

  if (!basketItem) return res.redirect('/basket');

  if (basketItem.accountFk !== req.user.id) return res.redirect('/basket');

  return next();
}

async function isValidEdit(req, res, next) {
  const { basketItemId } = req.body;
  const basketItem = await basketOperations.getBasketItem(basketItemId);

  if (!basketItem) return res.redirect('/basket');

  if (basketItem.accountFk !== req.user.id) return res.redirect('/basket');

  return next();
}

module.exports = {
  isValidEditSession,
  isValidEdit,
};
