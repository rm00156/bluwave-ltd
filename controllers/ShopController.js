const companyInfo = require('../utilty/company/companyInfo');
const productOperations = require('../utilty/products/productOperations');
const basketOperations = require('../utilty/basket/basketOperations');
const orderOperations = require('../utilty/order/orderOperations');
const deliveryOperations = require('../utilty/delivery/deliveryOperations');
const queueOperations = require('../utilty/queue/queueOperations');
const accountOperations = require('../utilty/account/accountOperations');
const models = require('../models');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
async function getShopTypePage(req, res) {

    const type = req.query.type;
    
    var productType = null;
    if(type != undefined)
        productType = await productOperations.getProductTypeByType(type);
    
    const products = !productType ? await productOperations.getAllActiveProducts() : await productOperations.getAllProductsByProductTypeId(productType.id);
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;
    res.render('shop', {user: req.user,
                companyDetails: companyInfo.getCompanyDetails(),
                navigationBarHeaders: navigationBarHeaders,
                products: products,
                basketItems: basketItems,
                allProductTypes: allProductTypes,
                displayCookieMessage: displayCookieMessage,
                productType: productType})
}

async function getProductPage(req, res) {

    const productName = req.params.productName;
    if(productName == undefined)
        return res.redirect('/shop');
    
    const product = await productOperations.getProductByProductName(productName);
    if(product == undefined)
        return res.redirect('/shop');
    
    const productType = await productOperations.getActiveProductTypeById(product.productTypeFk);
    const lowestPriceWithQuantity = await productOperations.getLowestPriceWithQuantityForProductByProductId(product.id);
    if(lowestPriceWithQuantity == null)
        throw new Error();

    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    const optionTypesAndOptions = await productOperations.getOptionTypesAndOptionsForProductByProductId(product.id);
    const sizeOptions = optionTypesAndOptions['Size'];
    var templates = [];
    if(sizeOptions) {
        // templates otherwise
        templates = await productOperations.getTemplatesForSizeOptions(sizeOptions.map(s => s.optionId));
    }
    res.render('product', {user: req.user, companyDetails: companyInfo.getCompanyDetails(),
                    product: product,
                    productType: productType,
                    navigationBarHeaders: navigationBarHeaders,
                    basketItems: basketItems,
                    allProductTypes: allProductTypes,
                    displayCookieMessage: displayCookieMessage,
                    templates: templates,
                    lowestPriceWithQuantity: lowestPriceWithQuantity});
}

async function getQuantityPriceTableDetails(req, res) {

    const unParsedOptions = req.query.options;
    const productId = req.query.productId;

    const options = JSON.parse(unParsedOptions);

    console.log(options);

    const quantityPriceTable = await productOperations.getQuantityPriceTable(options, productId);

    if(quantityPriceTable.length == 0)
        return res.status(204).json({});
    
    return res.status(200).json(quantityPriceTable);
}

async function getOptionTypesAndOptionsForProductByProductId(req, res) {
    
    const productId = req.query.productId;
    const results = await productOperations.getOptionTypesAndOptionsForProductByProductId(productId);

    if(results == null)
        return res.status(204);

    return res.status(200).json(results);
}

async function addToBasket(req, res) {

    const productId = req.body.productId;
    const selectedOptions = JSON.parse(req.body.selectedOptions);
    const quantityId = req.body.quantityId;
    const price = req.body.price;

    const transaction = await models.sequelize.transaction();

    try {

        const optionGroup = await productOperations.createOptionGroup();
        selectedOptions.forEach(async option => {
            await productOperations.createOptionGroupItem(optionGroup.id, option.id);
        });

        await basketOperations.createBasketItem(req.user.id, productId, optionGroup.id, quantityId, price);

    } catch(err) {
        console.log(err);
        await transaction.rollback();
        res.status(400).json({});
    }

    await transaction.commit();

    res.status(201).json({});
}

async function getBasketPage(req, res) {
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;
    const checkoutMessage = req.session.checkoutMessage;
    req.session.checkoutMessage = false;
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('basket', {
                            user: req.user,
                            navigationBarHeaders: navigationBarHeaders,
                            basketItems: basketItems,
                            displayCookieMessage: displayCookieMessage,
                            checkoutMessage: checkoutMessage,
                            allProductTypes: allProductTypes,
                            companyDetails: companyInfo.getCompanyDetails()})
}

async function deleteBasketItem(req, res) {

    const basketItemId = req.body.basketItemId;

    const transaction = await models.sequelize.transaction();

    try {
        await basketOperations.removeBasketItem(basketItemId);

    } catch(err) {

        console.log(err);
        await transaction.rollback();
        return res.status(400).json({});
    }

    await transaction.commit();

    res.status(200).json({});
}

async function updateBasketQuantity(req, res) {

    const basketItemId = req.body.basketItemId;
    const quantityId = req.body.quantityId;

    const transaction = await models.sequelize.transaction();

    try {
        await basketOperations.updateQuantityPriceForBasketItem(basketItemId, quantityId)
    } catch(err) {
        console.log(err);
        await transaction.rollback();
        return res.status(400).json({});
    }

    await transaction.commit();
    
    res.status(200).json({});
}

async function getDesignUploadPage(req, res) {

    const basketItemId = req.params.basketItemId;
    const basketItem = await basketOperations.getBasketItem(basketItemId);

    if(basketItem.accountFk != req.user.id)
        return res.redirect('/basket');

    const product = await productOperations.getProductById(basketItem.productFk);
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;
        
    const fileGroupItems = await basketOperations.getFileGroupItemsForBasketItem(basketItem);
    res.render('designUpload', {user: req.user,
                companyDetails: companyInfo.getCompanyDetails(),
                navigationBarHeaders: navigationBarHeaders,
                allProductTypes: allProductTypes,
                basketItems: basketItems,
                basketItem: basketItem,
                product: product,
                fileGroupItems: fileGroupItems,
                displayCookieMessage: displayCookieMessage
    });
}

async function uploadDesign(req, res) {

    const basketItemId = req.body.basketItemId;
    const file = req.files.file;

    const transaction = await models.sequelize.transaction();

    try {
        await basketOperations.uploadDesignForBasketItem(file, basketItemId);
    } catch(err) {
        console.log(err);
        await transaction.rollback();
        return res.status(400).json({});
    }

    await transaction.commit();
    res.status(200).json({});
}

async function removeFileGroupItem(req, res) {
    
    const basketItemId = req.body.basketItemId;
    const fileGroupItemId = req.body.fileGroupItemId;

    const transaction = await models.sequelize.transaction();

    try {
        await basketOperations.removeFileGroupItem(fileGroupItemId, basketItemId);
    } catch(err) {
        
        console.log(err);
        await transaction.rollback();
        return res.status(400).json({});
    }

    await transaction.commit();

    res.status(200).json({});
}

async function checkoutPage(req, res) {
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    const deliveryOptions = await deliveryOperations.getDeliveryOptionsForProducts(basketItems.basketItems.map(b => b.productFk));
    var displayCookieMessage = req.body.displayCookieMessage;
    const guestEmail = req.session.guestEmail;

    res.render('checkout', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        navigationBarHeaders: navigationBarHeaders,
        allProductTypes: allProductTypes,
        basketItems: basketItems,
        guestEmail: guestEmail,
        deliveryOptions: deliveryOptions,
        displayCookieMessage: displayCookieMessage
    });
}

async function checkoutLoginPage(req, res) {

    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    res.render('checkoutLogin', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails(),
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        allProductTypes: allProductTypes,
        displayCookieMessage: displayCookieMessage
    });
}

async function checkoutAsGuest(req, res) {
    
    const email = req.body.email;

    // const account = await accountOperations.findAccountByEmail(email);
    // if(account != null) { 
    //     // account already signed up
    //     // ask the user to please sign in
    //     // direct to login page so normal
    //     return loginController.render_checkoutLogin(req, res, 'An account with this email already exist. Please log in.');
    // }

    req.session.checkoutAsGuestFl = true;
    req.session.guestEmail = email;
    res.redirect('/checkout');
}

async function checkout(req, res) {
    
    const url = req.body.url;
    const accountId = req.user.id;
    const fullName = req.body.fullName;
    const email = req.body.email;
    const phoneNumber = req.body.phoneNumber;
    const deliveryPrice = req.body.deliveryPrice;

    const deliveryTypeId = req.body.deliveryTypeId;

    const deliveryType = await deliveryOperations.getDeliveryType(deliveryTypeId);
    var shippingDetail = null;

    const basketItems = await basketOperations.getAllBasketItemsForCheckout(accountId);
    const subtotal = basketOperations.getSubtotalFromBasketItems(basketItems);
    const total = parseFloat(subtotal) + parseFloat(deliveryPrice);

    const transaction = await models.sequelize.transaction();
    const lineItems = new Array();
    var purchaseBasket;
    try {
        if(deliveryType.collectFl == false) {
            // createShippingDetail
    
            const addressLine1 = req.body.addressLine1;
            const addressLine2 = req.body.addressLine2;
            const city = req.body.city;
            const postCode = req.body.postCode;
    
            shippingDetail = await deliveryOperations.createShippingDetail(accountId, fullName, email,
                addressLine1, addressLine2, city, postCode, phoneNumber,
                true, false);
        }

        purchaseBasket = await orderOperations.createPurchaseBasket(accountId, fullName, email, phoneNumber, subtotal, total, shippingDetail, deliveryTypeId, deliveryPrice);
          
        for(var i = 0; i < basketItems.length; i++) {
            const basketItem = basketItems[i];
            const quantity = basketItem.quantity;
            var amount = (parseFloat(basketItem.price))*100;
            var lineItem = {name:`${basketItem.name} - (${quantity} units)`, amount:amount, currency:'gbp', quantity: 1};
        
            lineItems.push(lineItem);

            await basketOperations.setPurchaseBasketForBasketItem(basketItem.id, purchaseBasket.id);
        }

        var amount = parseInt((parseFloat(deliveryPrice)) * 100);
        var lineItem = {name:deliveryType.name, amount:amount, currency:'gbp', quantity:1};
        
        lineItems.push(lineItem);

    } catch (err) {

        console.log(err);
        await transaction.rollback();
        return res.status(400).json({});
    }

    await transaction.commit();
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: email,
        client_reference_id: purchaseBasket.id,
        mode: 'payment',
        success_url: url + '/purchase_successful/' + purchaseBasket.id,
        cancel_url: url + '/checkout',
    });

    await orderOperations.updatePurchaseBasketWithOrderId(purchaseBasket.id, session.payment_intent);

    return res.status(201).json({session:session});
}

async function sessionCompleted(req, res) {
    
    const sig = req.headers['stripe-signature'];

    var event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.log(err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // console.log(event.data);
        // console.log(session.client_reference_id);
        var purchaseBasketId = session.client_reference_id;

        var now = new Date();
        var transaction = await models.sequelize.transaction();

        try {
            await orderOperations.completePurchaseBasket(purchaseBasketId, now);
            await queueOperations.addSendPurchaseEmail(purchaseBasketId);

            const orderDetails = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
            const text = `${orderDetails.fullName} just made order of £${(parseFloat(orderDetails.total)).toFixed(2)}`;
            const link = `/admin_dashboard/order/${orderDetails.id}`;
            await accountOperations.createNotificationForAdminAccounts(text, link);
        }
        catch (err) {
            console.log(err);
            await transaction.rollback();
            throw 'purchasebasket update for orderNumber ' + 'blu-' + purchaseBasketId + ' failed';
        }

        await transaction.commit();

        res.json({received: true});
    }
}

async function purchaseSuccessfulPage(req, res) {

    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    const purchaseBasket = await basketOperations.getPurchaseBasketById(req.params.id);
    res.render('purchaseSuccessful', {user: req.user, companyDetails: companyInfo.getCompanyDetails(),
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        orderNumber: purchaseBasket.orderNumber,
        allProductTypes: allProductTypes,
        displayCookieMessage: displayCookieMessage});
}

module.exports = {
    getShopTypePage,
    getProductPage,
    getQuantityPriceTableDetails,
    getOptionTypesAndOptionsForProductByProductId,
    addToBasket,
    getBasketPage,
    deleteBasketItem,
    updateBasketQuantity,
    getDesignUploadPage,
    uploadDesign,
    removeFileGroupItem,
    checkoutPage,
    checkoutLoginPage,
    checkoutAsGuest,
    checkout,
    sessionCompleted,
    purchaseSuccessfulPage
}