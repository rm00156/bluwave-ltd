const companyInfo = require('../utilty/company/companyInfo');
const passport = require('passport');
const { validateUser } = require('../validators/signup');
const { isEmpty } = require('lodash');
const accountOperations = require('../utilty/account/accountOperations');
const productOperations = require('../utilty/products/productOperations');
const deliveryOperations = require('../utilty/delivery/deliveryOperations');
const basketOperations = require('../utilty/basket/basketOperations');
const emailOperations = require('../utilty/email/emailOperations');
const orderOperations = require('../utilty/order/orderOperations');
const refundOperations = require('../utilty/refund/refundOperations');
const stripe = require('stripe')(process.env.STRIPE_KEY);

var GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const models = require('../models');

exports.getAdminDashboardPage = async function (req, res) {
    var message = req.session.message;
    req.session.message = undefined;

    const orderDetailsInLastMonth = await orderOperations.getOrderDetailsInLastMonth();
    const newCustomersInTheLastWeek = await accountOperations.getNewCustomersInTheLastWeek();
    res.render('adminDashboard', {
        user: req.user,
        message: message,
        orderDetailsInLastMonth: orderDetailsInLastMonth,
        newCustomersInTheLastWeek: newCustomersInTheLastWeek,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

exports.getCreateAdminPage = async function (req, res) {

    res.render('createAdmin', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

exports.createAdmin = async function (req, res, next) {
    const errors = {};

    return validateUser(errors, req).then(async errors => {

        if (!isEmpty(errors)) {
            // reRender the sign up page with the errors
            console.log(errors);
            rerenderCreateAdmin(errors, req, res);
        }
        else {
            await accountOperations.createAccount(1, req.body.email, req.body.name, req.body.phoneNumber, req.body.password);

            req.session.message = 'Admin account created!';
            res.redirect('/admin_dashboard');
        }
    })
}

exports.getSetup2faPage = async function (req, res) {
    await render_setup2fa(req, res, false);
}

exports.setup2fa2Registration = async function (req, res, next) {
    passport.authenticate('register', async (err, account, info) => {
        if (err) {
            return next(err);
        }

        if (!account) {
            return await render_setup2fa(req, res, true);
        }

        await accountOperations.complete2FaSetupForAccountId(account.id, req.body.secret);

        req.session.message = '2FA has been successfully set up';
        return res.redirect('/admin_dashboard');

    })(req, res, next);

}

exports.getProductsPage = async function (req, res) {
    const products = await productOperations.getAllProductWithLowestPriceDetails();
    res.render('adminProducts', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        products: products
    });
}

exports.getAddProductPage = async function (req, res) {
    const productTypes = await productOperations.getAllActiveProductTypes();
    const optionTypes = await productOperations.getAllOptionTypes();
    const quantities = await productOperations.getAllQuantities();
    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    var message = req.session.message;
    req.session.message = undefined;
    res.render('addProduct', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        productTypes: productTypes,
        quantities: quantities,
        optionTypes: optionTypes,
        deliveryTypes: deliveryTypes,
        message: message
    });
}

exports.getOptionsForOptionType = async function (req, res) {

    const optionTypeId = req.query.optionTypeId;
    const options = await productOperations.getOptionsForOptionTypeId(optionTypeId);

    if (options.length == 0)
        return res.status(404);

    return res.status(200).json(options);
}

exports.getProductPage = async function (req, res) {
    const productId = req.params.id;
    // need to get all the details for product
    const productTypes = await productOperations.getAllActiveProductTypes();
    const optionTypes = await productOperations.getAllOptionTypes();
    const quantities = await productOperations.getAllQuantities();
    const product = await productOperations.getProductById(productId);
    var message = req.session.message;
    req.session.message = undefined;
    // TODO
    if (product == null)
        return res.redirect('/admin_dashboard');

    var optionTypesAndOptions = await productOperations.getOptionTypesAndOptionsForProductByProductId(productId);
    await productOperations.addAllOptionTypesToOptionTypesAndOptionJson(optionTypesAndOptions);
    const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);
    // const selectedOptionTypes = Array.from(new Set(optionTypesAndOptions.map(o => o.optionTypeId)));

    const matrixRows = await productOperations.getPriceMatrixForProduct(productId);
    const selectedOptionTypes = matrixRows[0][0].options.map(o => o.optionType);

    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(productId);
    res.render('adminProduct', {
        user: req.user,
        product: product,
        productTypes: productTypes,
        quantities: quantities,
        optionTypes: optionTypes,
        optionTypesAndOptions: optionTypesAndOptions,
        selectedQuantities: selectedQuantities,
        matrixRows: matrixRows,
        message: message,
        selectedOptionTypes: selectedOptionTypes,
        productDeliveries: productDeliveries,
        deliveryTypes: deliveryTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getProductTypesPage = async function (req, res) {

    const productTypes = await productOperations.getAllProductTypesWithNumberOfProducts();

    res.render('adminProductTypes', {
        user: req.user,
        productTypes: productTypes,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.createProduct = async function (req, res) {

    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const rows = JSON.parse(req.body.rows);
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const options = parseCommaSeperatedText(req.body.options);
    const quantities = parseCommaSeperatedText(req.body.quantities);
    const deleteFl = JSON.parse(req.body.deleteFl);
    const deliveryOptions = JSON.parse(req.body.deliveryOptions);

    const productDetails = {
        name: productName,
        productTypeFk: productTypeId,
        description: description,
        subDescription: subDescription,
        subDescriptionTitle: subDescriptionTitle,
        deleteFl: deleteFl,
        versionNo: 1
    };

    const transaction = await models.sequelize.transaction();

    try {
        const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
        const product = await productOperations.createProduct(productDetails, s3PathMap, bulletPoints);

        // create priceMatrix object
        const priceMatrix = await productOperations.createPriceMatrix(product.id, options, quantities);
        await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
        await deliveryOperations.createDeliveryOptionsForProduct(product.id, deliveryOptions);
        req.session.message = 'Product ' + product.name + ' has been successfully created';
    } catch (err) {
        console.log(err)
        await transaction.rollback();
        req.session.message = 'Error Creating product, please contact support'
        return res.status(500).send(err);
    }

    await transaction.commit();
    return res.status(201).json({});
}

exports.getOptionTypesAndOptionForProduct = async function (req, res) {

    const productId = req.query.productId;
    const optionTypesAndOptions = await productOperations.getOptionTypesAndOptionsForProductByProductId(productId);
    const parsedOptionTypesAndOptions = await productOperations.parseOptionTypesAndOption(optionTypesAndOptions);

    res.status(200).json(parsedOptionTypesAndOptions);
}

exports.editProduct = async function (req, res) {

    const productId = req.body.productId;
    const productName = req.body.productName;
    const productTypeId = req.body.productTypeId;
    const rows = JSON.parse(req.body.rows);
    const files = req.files;
    const description = req.body.description;
    const subDescription = req.body.subDescription;
    const subDescriptionTitle = req.body.subDescriptionTitle;
    const bulletPoints = parseCommaSeperatedText(req.body.bulletPoints);
    const options = parseCommaSeperatedText(req.body.options);
    const quantities = parseCommaSeperatedText(req.body.quantities);
    const deleteFl = JSON.parse(req.body.deleteFl);
    const deliveryOptions = JSON.parse(req.body.deliveryOptions);

    const transaction = await models.sequelize.transaction();

    try {
        const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
        addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);

        const productDetails = {
            productId: productId,
            productName: productName,
            productTypeId: productTypeId,
            description: description,
            subDescription: subDescription,
            subDescriptionTitle: subDescriptionTitle,
            bulletPoints: bulletPoints,
            s3PathMap: s3PathMap,
            deleteFl: deleteFl
        }
        await productOperations.updateProduct(productDetails);

        const optionTypesAndOptions = await productOperations.getOptionTypesAndOptionsForProductByProductId(productId);
        const existingOptionIds = getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions);
        const exisitingQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);
        const existingQuantityIds = exisitingQuantities.map(q => q.id.toString());
        await deliveryOperations.updateProductDeliveriesForProduct(productId, deliveryOptions);

        if (hasNewMatrixBeenCreated(options, existingOptionIds, quantities, existingQuantityIds)) {
            console.log('new created')
            // delete active priceMatrix For product
            await productOperations.deletePriceMatrixForProduct(productId);
            const priceMatrix = await productOperations.createPriceMatrix(productId, options, quantities);
            await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
        } else {
            console.log('same matrix')
            // then just update
            await productOperations.updatePriceMatrixRowPrices(rows);
        }

        req.session.message = 'Product ' + productName + ' has been successfully updated';

    } catch (err) {
        console.log(err);
        await transaction.rollback();
        req.session.message = 'Error Updating product, please contact support'
        return res.status(500).send(err);
    }
    await transaction.commit();

    res.status(200).json({});
}

exports.getProductTypePage = async function (req, res) {
    const id = req.params.id;
    const productType = await productOperations.getProductTypeById(id);
    var message = req.session.message;
    req.session.message = undefined;

    res.render('adminProductType', {
        user: req.user,
        productType: productType,
        message: message,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.editProductType = async function (req, res) {
    const productTypeName = req.body.productTypeName;
    const productTypeId = req.body.productTypeId;
    const files = req.files;
    const deleteFl = JSON.parse(req.body.deleteFl);

    const transaction = await models.sequelize.transaction();

    try {
        var s3PathMap = null;
        if (files != null) {
            s3PathMap = await productOperations.uploadPictures('ProductTypes/', productTypeName, files);
        }

        var productTypeDetails = {
            productTypeName: productTypeName,
            productTypeId: productTypeId,
            deleteFl: deleteFl
        };

        if (s3PathMap != null) {
            productTypeDetails['bannerPath'] = s3PathMap.get('banner');
        }

        await productOperations.updateProductType(productTypeDetails);
        req.session.message = 'Product Type' + productTypeName + ' has been successfully updated';

    } catch (err) {
        console.log(err);
        await transaction.rollback();
        req.session.message = 'Error Updating product type, please contact support'
        return res.status(500).send(err);
    }

    await transaction.commit();
    res.status(200).json({});
}

exports.getDeliveryTypes = async function (req, res) {

    const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
    res.status(200).json({ deliveryTypes });
}

exports.getDeliveryType = async function (req, res) {
    const id = req.query.id;
    const deliveryType = await deliveryOperations.getDeliveryType(id);

    res.status(200).json({ deliveryType });
}

exports.getAccountsPage = async function (req, res) {

    const accounts = await accountOperations.getAllNonGuestAccounts();

    res.render('adminAccounts', {
        user: req.user,
        accounts: accounts,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountPage = async function (req, res) {

    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');

    res.render('adminAccount', {
        user: req.user,
        account: account,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountDeletePage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
    res.render('adminAccountDelete', {
        user: req.user,
        account: account,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountEmailsPage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const emails = await emailOperations.getEmailsForByEmailAddress(account.email);
    res.render('adminAccountEmails', {
        user: req.user,
        account: account,
        emails: emails,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountOrdersPage = async function (req, res) {
    const id = req.params.id;
    const account = await accountOperations.getAccountById(id);
    if (account.guestFl == true)
        return res.redirect('/admin_dashboard/accounts');
    const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
    res.render('adminAccountOrders', {
        user: req.user,
        account: account,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getAccountOrderPage = async function (req, res) {
    const purchaseBasketId = req.params.id;

    const order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);

    const account = await accountOperations.getAccountById(order.accountFk);
    const shippingDetailFk = order.shippingDetailFk;
    const shippingDetail = (shippingDetailFk == null) ? null : await deliveryOperations.getShippingDetailById(shippingDetailFk);
    const basketItems = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
    const isNewRefundPossible = refundOperations.isRefundPossibleForOrder(refunds, order.total);
    const message = req.session.message;
    req.session.message = undefined;

    res.render('adminOrder', {
        user: req.user,
        account: account,
        order: order,
        shippingDetail: shippingDetail,
        companyDetails: companyInfo.getCompanyDetails(),
        basketItems: basketItems,
        refunds: refunds,
        message: message,
        isNewRefundPossible: isNewRefundPossible
    });
}

exports.getOrdersPage = async function (req, res) {

    const orders = await orderOperations.getAllCompletedOrders();
    res.render('adminOrders', {
        user: req.user,
        orders: orders,
        companyDetails: companyInfo.getCompanyDetails()
    })
}

exports.getRefundTypes = async function (req, res) {

    const refundTypes = await refundOperations.getRefundTypes();
    res.status(200).json(refundTypes);
}

exports.createRefund = async function (req, res) {

    const refundTypeId = req.body.refundTypeId;

    const purchaseBasketId = req.body.orderId;
    const order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
    const amount = refundTypeId == 2 ? order.total : req.body.amount;
    const refundAmount = parseFloat(amount) * 100;

    try {
        await stripe.refunds.create({
            payment_intent: order.orderId,
            amount: refundAmount
        });
    } catch (err) {
        console.log(err)
        return res.status(400).json({ error: 'There was an issue with attempting to make a refund. Either try again or login into your stripe account for more details' });
    }

    await refundOperations.createRefund(purchaseBasketId, refundTypeId, refundAmount);

    req.session.message = 'Refund Successful';
    return res.status(200).json({});
}

exports.getOustandingAmountOfOrder = async function (req, res) {

    const purchaseBasketId = req.query.purchaseBasketId;

    const purchaseBasket = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
    const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
    const max = await refundOperations.maxRefundPossibleForOrder(refunds, purchaseBasket.total);

    res.status(200).json({ max: max });
}

exports.getNotifications = async function (req, res) {

    const accountId = req.user.id;

    const notificationDetails = await getNotificationDetails(accountId);

    res.status(200).json(notificationDetails);
}

exports.deleteNotification = async function (req, res) {
    const id = req.body.id;

    await accountOperations.deleteNotificationById(id);

    res.status(200).json({});
}

exports.deleteNotifications = async function (req, res) {
    
    await accountOperations.deleteAllNotificationsForAccount(req.user.id);
    res.status(200).json({});
}

function getTimeDifference(date) {
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - date.getTime();

    const minutes = Math.floor(timeDifference / (1000 * 60));
    if (minutes < 60) {
        return `${minutes} minutes ago`;
    }

    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    if (hours < 24) {
        return `${hours} hours ago`;
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
}


function hasNewMatrixBeenCreated(newOptions, existingOptions, newQuantities, exisitingQuantities) {

    const optionsTheSame = hasTheSameItems(newOptions, existingOptions);
    const quantitiesTheSame = hasTheSameItems(newQuantities, exisitingQuantities);

    return optionsTheSame == false || quantitiesTheSame == false;
}

function hasTheSameItems(list1, list2) {
    return list1.length === list2.length && list1.every(item => list2.includes(item));
}

function getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions) {
    var result = [];
    for (key in optionTypesAndOptions) {

        const optionTypeAndOptions = optionTypesAndOptions[key];
        result.push(...optionTypeAndOptions.map(o => o.optionId.toString()));
    }

    return result;
}

function addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, request) {

    for (var i = 1; i < 6; i++) {

        const item = JSON.parse(request[i + "Remove"]);
        if (item == true) {
            s3PathMap.set(i.toString(), null);
        }
    }
}

async function rerenderCreateAdmin(errors, req, res) {
    res.render('createAdmin', {
        errors: errors,
        formData: req.body,
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()
    });
}

function parseCommaSeperatedText(text) {

    const textSplit = text.split(',');

    if (textSplit.length == 0)
        return [textSplit];

    return textSplit;
}

async function render_setup2fa(req, res, error) {
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(req.user.id);

    var secret;
    var qrCode;
    if (twoFactorAuth == null) {
        var qrInfo = GoogleAuthenticator.register(companyInfo.getCompanyDetails().COMPANY_NAME + ' (' + req.user.email + ')');
        secret = qrInfo.secret;
        qrCode = qrInfo.qr;

        await accountOperations.createTwoFactorAuthForAccountId(req.user.id, secret, qrCode);
    } else {
        secret = twoFactorAuth.secret;
        qrCode = twoFactorAuth.qrCode;
    }

    var data = { user: req.user, secret: secret, qrCode: qrCode, companyDetails: companyInfo.getCompanyDetails() };
    if (error)
        data['error'] = "Code entered was incorrect. Please scan the new code in your authenticator app and enter the code.";
    res.render('setup2fa', data);
}

async function getNotificationDetails(accountId) {
    var notifications = await accountOperations.getNotificationsForAccount(accountId);
    const numberOfNotifications = notifications.length;
    notifications = notifications.slice(0, 3);
    notifications = notifications.map(n => {
        return {id: n.id, link: n.link, text: n.text, longAgo: getTimeDifference(n.createdDttm) };
    })

    return { numberOfNotifications: numberOfNotifications, notifications: notifications };
}