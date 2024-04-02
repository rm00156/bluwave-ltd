const basketOperations = require('../utility/basket/basketOperations');

async function isArtworkRequired(req, res, next) {
  const activeBaskeItemDetials = await basketOperations.getActiveBasketItemsForAccount(req.user.id);

  const { basketItems } = activeBaskeItemDetials;
  const numberOfBasketItems = basketItems.length;

  const numberOfBasketItemsWithArtwork = basketItems.filter((b) => b.fileGroupFk != null).length;

  if (numberOfBasketItems === numberOfBasketItemsWithArtwork) {
    req.session.checkoutMessage = false;
    return next();
  }

  req.session.checkoutMessage = true;
  return res.redirect('/basket');
}

module.exports = {
  isArtworkRequired,
};
