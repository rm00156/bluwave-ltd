const { isEmpty } = require('lodash');
const promoCodeOperations = require('../utility/promoCode/promoCodeOperations');
const { hasPromoCodeNotChanged, validatePromoCode } = require('../validators/promoCode');
const { validateDate } = require('../validators/sale');
const companyInfo = require('../utility/company/companyInfo');
const { getSuccessfulOrdersForAccountId } = require('../utility/order/orderOperations');

async function getProductWithNoActivePromoCodes(req, res) {
  const { fromDt, toDt } = req.params;

  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const products = await promoCodeOperations.getProductsWithNoActivePromoCodes(fromDt, toDt);

  return res.status(200).json(products);
}

async function getProductWithNoActivePromoCodesForPromoCode(req, res) {
  const { id, fromDt, toDt } = req.params;
  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const currentProducts = await promoCodeOperations.getProductsForPromoCodeIdWhichOverlapDates(id, fromDt, toDt);
  const otherProducts = await promoCodeOperations.getProductsWithNoActivePromoCode(fromDt, toDt);

  const result = [...currentProducts, ...otherProducts];
  return res.status(200).json(result);
}

async function getPromoCodesPage(req, res) {
  const promoCodes = await promoCodeOperations.getAllPromoCodes();
  res.render('adminPromoCodes', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    promoCodes,
  });
}

async function getCreatePromoCodePage(req, res) {
  res.render('addPromoCode', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function createPromoCode(req, res) {
  const errors = await validatePromoCode(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const {
    code, fromDt, toDt, description, percentage, promoCodeTypeId, maxUses, ids,
  } = req.body;
  const createdPromoCode = await promoCodeOperations.createPromoCode(
    code,
    fromDt,
    toDt,
    description,
    percentage,
    promoCodeTypeId,
    maxUses && maxUses !== '' ? maxUses : null,
    ids,
  );

  return res.status(200).json({ id: createdPromoCode.id });
}

async function getPromoCodeTypes(req, res) {
  const promoCodeTypes = await promoCodeOperations.getAllPromoCodeTypes();
  return res.status(200).json(promoCodeTypes);
}

async function getPromoCodePage(req, res) {
  const { id } = req.params;

  const promoCode = await promoCodeOperations.getPromoCodeById(id);
  if (!promoCode) {
    return res.redirect('/admin-dashboard');
  }

  return res.render('adminPromoCode', {
    promoCode,
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getPromoCodeProducts(req, res) {
  const { id } = req.params;

  const promoCodeProducts = await promoCodeOperations.getPromoCodeProductsForPromoCodeId(id);
  const productIds = promoCodeProducts.map((promoCodeProduct) => promoCodeProduct.productFk);
  return res.status(200).json({ productIds });
}

async function updatePromoCode(req, res) {
  const { id } = req.params;

  const promoCode = await promoCodeOperations.getPromoCodeById(id);

  if (!promoCode) {
    return res.status(400).json({ error: 'No promo code found' });
  }

  const errors = await validatePromoCode(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  if (await hasPromoCodeNotChanged(req.body, promoCode)) {
    return res.status(400).json({ errors: { noChange: true } });
  }

  const {
    code, fromDt, toDt, description, percentage, promoCodeTypeId, maxUses, ids,
  } = req.body;
  const newPromoCode = await promoCodeOperations.updatePromoCode(
    promoCode.id,
    code,
    fromDt,
    toDt,
    description,
    percentage,
    promoCodeTypeId,
    maxUses,
    ids,
  );

  return res.status(200).json({ id: newPromoCode.id });
}

async function removePromoCode(req, res) {
  const { user } = req;
  const basketItems = await promoCodeOperations.getActiveBasketItemsWherePromoCodeAppliesForAccountId(user.id);

  if (basketItems.length === 0) return res.status(400).json({ error: 'There is no promotional code to be removed' });

  const basketItemsIds = basketItems.map((b) => b.id);

  await promoCodeOperations.removePromoCode(basketItemsIds);
  return res.status(200).json({});
}

async function applyPromoCode(req, res) {
  const { code } = req.body;

  const promoCode = await promoCodeOperations.getActivePromoCodeByCode(code);

  if (!promoCode) {
    return res.status(400).json({ error: 'The promotional code you entered is not valid.' });
  }

  const { user } = req;
  const basketItems = await promoCodeOperations.getActiveBasketItemsWherePromoCodeAppliesForAccountId(user.id, promoCode.id);

  if (basketItems.length === 0) return res.status(400).json({ error: 'The promotional code you entered is not applicable to your basket.' });

  if (promoCode.promoCodeType === 'FirstOrder') {
    // get orders for account
    const orders = await getSuccessfulOrdersForAccountId(user.id);
    if (orders.length > 0) return res.status(400).json({ error: 'The promotional code you entered is not applicable to your basket.' });
  }

  const basketItemsIds = basketItems.map((b) => b.id);
  await promoCodeOperations.applyPromoCode(promoCode, basketItemsIds);

  return res.status(200).json({});
}

module.exports = {
  applyPromoCode,
  createPromoCode,
  getCreatePromoCodePage,
  getProductWithNoActivePromoCodesForPromoCode,
  getPromoCodePage,
  getPromoCodesPage,
  getPromoCodeProducts,
  getPromoCodeTypes,
  getProductWithNoActivePromoCodes,
  removePromoCode,
  updatePromoCode,
};
