const companyInfo = require('../utilty/company/companyInfo');
const productOperations = require('../utilty/products/productOperations');
const accountOperations = require('../utilty/account/accountOperations');
const orderOperations = require('../utilty/order/orderOperations');
const basketOperations = require('../utilty/basket/basketOperations');
const refundOperations = require('../utilty/refund/refundOperations');
const loginController = require('../controllers/LoginController');

const bcrypt = require('bcrypt');

exports.getOrdersPage = async function(req, res) {

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(req.user.id);
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('accountOrders', {user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        allProductTypes: allProductTypes,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.getOrderPage = async function(req, res) {

    const orderId = req.params.id;
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    const order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(orderId);
    const shippingDetailFk = order.shippingDetailFk;
    const shippingDetail = (shippingDetailFk == null) ? null : await deliveryOperations.getShippingDetailById(shippingDetailFk);
    const orderItems = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(orderId);
    const refunds = await refundOperations.getRefundsForOrder(orderId);
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('accountOrder', {user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        allProductTypes: allProductTypes,
        basketItems: basketItems,
        orderItems: orderItems,
        order: order,
        shippingDetail: shippingDetail,
        refunds: refunds,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.getSettingsPage = async function(req, res) {

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(req.user.id);
    const message = req.session.message;
    req.session.message = undefined;
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('accountSettings', {user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        allProductTypes: allProductTypes,
        orders: orders,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.editProfile = async function(req, res) {

    const name = req.body.name;
    const phoneNumber = req.body.phoneNumber;

    await accountOperations.updateAccountNameAndPhoneNumber(req.user.id, name, phoneNumber);
    req.session.message = 'Settings updated';
    res.status(200).json({});
}

exports.changePassword = async function(req, res) {

    const currentPassword = req.body.currentPassword;
    const password = req.body.password;

    if(bcrypt.compareSync(currentPassword, req.user.password)) {
        // update new
        await accountOperations.updatePassword(req.user.id, password);
        req.session.message = 'Password Updated';
        res.status(200).json({});
    } else {
        res.status(400).json({error: 'Current password is not correct'})
    }
}

exports.deleteAccount = async function(req, res) {

    const accountId = req.user.id;
    req.logout();
    req.session.destroy();
    res.clearCookie('bluwave_ecommerce_user_data');
    await accountOperations.deleteAccount(accountId);
    res.status(200).json({});
}