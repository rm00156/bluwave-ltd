const bcrypt = require('bcrypt');
const companyInfo = require('../utility/company/companyInfo');
const productOperations = require('../utility/products/productOperations');
const accountOperations = require('../utility/account/accountOperations');
const orderOperations = require('../utility/order/orderOperations');
const basketOperations = require('../utility/basket/basketOperations');
const refundOperations = require('../utility/refund/refundOperations');
const deliveryOperations = require('../utility/delivery/deliveryOperations');

async function getOrdersPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const orders = await orderOperations.getSuccessfulOrdersForAccountId(
    req.user.id,
  );
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  const freeDelivery = await deliveryOperations.getFreeDelivery();

  res.render('accountOrders', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    orders,
    companyDetails: companyInfo.getCompanyDetails(),
    freeDelivery,
  });
}

async function getOrderPage(req, res) {
  const orderId = req.params.id;
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const order = await orderOperations.getSuccessfulOrderForPurchaseBasketId(
    orderId,
  );
  const { shippingDetailFk } = order;
  const shippingDetail = shippingDetailFk == null
    ? null
    : await deliveryOperations.getShippingDetailById(shippingDetailFk);
  const orderBasketItems = await basketOperations.getBasketItemsForOrderId(
    orderId,
  );
  const refunds = await refundOperations.getRefundsForOrder(orderId);
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  const freeDelivery = await deliveryOperations.getFreeDelivery();

  res.render('accountOrder', {
    user: req.user,
    navigationBarHeaders,
    allProductTypes,
    basketItems,
    orderItems: orderBasketItems.basketItems,
    sale: orderBasketItems.sale,
    totalSaleAmount: orderBasketItems.totalSaleAmount,
    code: orderBasketItems.code,
    totalPromoCodeAmount: orderBasketItems.totalPromoCodeAmount,
    order,
    shippingDetail,
    refunds,
    companyDetails: companyInfo.getCompanyDetails(),
    freeDelivery,
  });
}

async function getSettingsPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const orders = await orderOperations.getSuccessfulOrdersForAccountId(
    req.user.id,
  );
  const { message } = req.session;
  req.session.message = undefined;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  const freeDelivery = await deliveryOperations.getFreeDelivery();

  res.render('accountSettings', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    orders,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
    freeDelivery,
  });
}

async function editProfile(req, res) {
  const { name } = req.body;
  const { phoneNumber } = req.body;

  await accountOperations.updateAccountNameAndPhoneNumber(
    req.user.id,
    name,
    phoneNumber,
  );
  req.session.message = 'Settings updated';
  res.status(200).json({});
}

async function changePassword(req, res) {
  const { currentPassword } = req.body;
  const { password } = req.body;

  if (bcrypt.compareSync(currentPassword, req.user.password)) {
    // update new
    await accountOperations.updatePassword(req.user.id, password);
    req.session.message = 'Password Updated';
    res.status(200).json({});
  } else {
    res.status(400).json({ error: 'Current password is not correct' });
  }
}

async function deleteAccount(req, res) {
  const accountId = req.user.id;
  req.logout();
  req.session.destroy();
  res.clearCookie('bluwave_ecommerce_user_data');
  await accountOperations.deleteAccount(accountId);
  res.status(200).json({});
}

module.exports = {
  changePassword,
  deleteAccount,
  editProfile,
  getSettingsPage,
  getOrderPage,
  getOrdersPage,
};
