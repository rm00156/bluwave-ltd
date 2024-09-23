const logger = require('pino')();
const stripe = require('stripe')(process.env.STRIPE_KEY);
const companyInfo = require('../utility/company/companyInfo');
const productOperations = require('../utility/products/productOperations');
const basketOperations = require('../utility/basket/basketOperations');
const orderOperations = require('../utility/order/orderOperations');
const deliveryOperations = require('../utility/delivery/deliveryOperations');
const { getSaleForProductId, getSubTotal, updateSalesUsedCountForOrder } = require('../utility/sales/salesOperations');
const { getActivePromoCodeForBasketAndProduct } = require('../utility/promoCode/promoCodeOperations');
// const notProduction = process.env.NODE_ENV !== 'production';

const queueOperations = process.env.NODE_ENV === 'test' ? null : require('../utility/queue/queueOperations');
const accountOperations = require('../utility/account/accountOperations');
const models = require('../models');

const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

async function getShopTypePage(req, res) {
  const { type } = req.query;

  let productType = null;
  if (type !== undefined) productType = await productOperations.getProductTypeByType(type);

  const products = !productType
    ? await productOperations.getAllActiveProducts()
    : await productOperations.getAllProductsByProductTypeId(productType.id);
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  res.render('shop', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    products,
    basketItems,
    allProductTypes,
    displayCookieMessage,
    productType,
  });
}

async function getProductPage(req, res) {
  const { productName } = req.params;
  if (productName === undefined) return res.redirect('/shop');

  const product = await productOperations.getProductByProductName(productName);
  if (product === undefined) return res.redirect('/shop');

  const productType = await productOperations.getActiveProductTypeById(
    product.productTypeFk,
  );
  const lowestPriceWithQuantity = await productOperations.getLowestPriceWithQuantityForProductByProductId(
    product.id,
  );
  if (lowestPriceWithQuantity === null) throw new Error();

  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(
    product.id,
  );
  const sizeOptions = optionTypesAndOptions.Size;
  let templates = [];
  if (sizeOptions) {
    // templates otherwise
    templates = await productOperations.getTemplatesForSizeOptions(
      sizeOptions.map((s) => s.optionId),
    );
  }

  const sale = await getSaleForProductId(product.id, true);

  const { edit } = req.query;
  let priceMatrixOptions = null;
  let finishingMatrixOptions = null;
  let currentQuantityId = null;
  if (edit) {
    // get the options for the optiongroups for basketitem
    const basketItem = await basketOperations.getBasketItem(edit);
    const options = await productOperations.getOptionGroupItemsByOptionGroupId(
      basketItem.optionGroupFk,
    );
    const finishingOptions = await productOperations.getOptionGroupItemsByOptionGroupId(
      basketItem.finishingOptionGroupFk,
    );

    priceMatrixOptions = options.map((o) => o.optionFk);
    finishingMatrixOptions = finishingOptions.map((f) => f.optionFk);
    currentQuantityId = basketItem.quantityFk;
  }

  return res.render('product', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    productType,
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    displayCookieMessage,
    templates,
    isEdit: !!edit,
    edit,
    priceMatrixOptions,
    currentQuantityId,
    finishingMatrixOptions,
    lowestPriceWithQuantity,
    sale,
  });
}

async function getQuantityPriceTableDetails(req, res) {
  const unParsedOptions = req.query.options;
  const { productId } = req.query;

  const options = JSON.parse(unParsedOptions);
  const finishingOptions = JSON.parse(req.query.finishingOptions);

  const quantityPriceTable = await productOperations.getQuantityPriceTable(
    options,
    finishingOptions,
    productId,
  );

  if (quantityPriceTable.length === 0) return res.status(204).json({});

  const sale = await getSaleForProductId(productId, true);
  return res.status(200).json({ quantityPriceTable, sale });
}

async function getPricingMatrixOptionTypesAndOptionsForProduct(req, res) {
  const productId = req.params.id;
  const results = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(
    productId,
  );

  if (results === null) return res.status(204);

  return res.status(200).json(results);
}

async function getFinishingMatrixOptionTypesAndOptionsForProduct(req, res) {
  const productId = req.params.id;
  const results = await productOperations.getFinishingMatrixOptionTypesAndOptionsForProduct(
    productId,
  );

  if (results === null) return res.status(200).json({});

  return res.status(200).json(results);
}

async function editBasketItem(req, res) {
  const selectedOptions = JSON.parse(req.body.selectedOptions);
  const selectedFinishingOptions = JSON.parse(
    req.body.selectedFinishingOptions,
  );

  const { priceMatrixRowQuantityPriceId, basketItemId, productId } = req.body;
  const priceMatrixRowQuantityPrice = await productOperations.getPriceMatrixRowQuantityPriceById(priceMatrixRowQuantityPriceId);
  if (priceMatrixRowQuantityPrice === null) return res.status(204).json({ error: 'incorrect priceMatrixRowQuantityPrice id' });

  const quantityId = priceMatrixRowQuantityPrice.quantityFk;
  const { price } = priceMatrixRowQuantityPrice;

  const sale = await getSaleForProductId(productId, true);
  const subTotal = getSubTotal(price, sale);

  const transaction = await models.sequelize.transaction();

  try {
    const optionGroup = await productOperations.createOptionGroup();
    selectedOptions.forEach(async (option) => {
      await productOperations.createOptionGroupItem(optionGroup.id, option.id);
    });

    if (selectedFinishingOptions.length > 0) {
      const finishingOptionGroup = await productOperations.createOptionGroup();
      selectedFinishingOptions.forEach(async (option) => {
        await productOperations.createOptionGroupItem(
          finishingOptionGroup.id,
          option.id,
        );
      });
      await basketOperations.editBasketItem(
        basketItemId,
        optionGroup.id,
        finishingOptionGroup.id,
        quantityId,
        price,
        subTotal,
        sale ? sale.id : null,
      );
    } else {
      await basketOperations.editBasketItem(
        basketItemId,
        optionGroup.id,
        null,
        quantityId,
        price,
        subTotal,
        sale ? sale.id : null,
      );
    }
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }

  await transaction.commit();

  return res.status(200).json({});
}

async function addToBasket(req, res) {
  const { productId, priceMatrixRowQuantityPriceId } = req.body;
  const selectedOptions = JSON.parse(req.body.selectedOptions);
  const selectedFinishingOptions = JSON.parse(
    req.body.selectedFinishingOptions,
  );
  const priceMatrixRowQuantityPrice = await productOperations.getPriceMatrixRowQuantityPriceById(priceMatrixRowQuantityPriceId);
  if (priceMatrixRowQuantityPrice === null) return res.status(204).json({ error: 'incorrect priceMatrixRowQuantityPrice id' });

  const quantityId = priceMatrixRowQuantityPrice.quantityFk;
  const { price } = priceMatrixRowQuantityPrice;
  const sale = await getSaleForProductId(productId, true);
  // get promo code from basket
  const promoCode = await getActivePromoCodeForBasketAndProduct(req.user.id, productId);
  const subTotal = getSubTotal(price, sale, promoCode);

  const transaction = await models.sequelize.transaction();

  try {
    const optionGroup = await productOperations.createOptionGroup();
    selectedOptions.forEach(async (option) => {
      await productOperations.createOptionGroupItem(optionGroup.id, option.id);
    });

    if (selectedFinishingOptions.length > 0) {
      const finishingOptionGroup = await productOperations.createOptionGroup();
      selectedFinishingOptions.forEach(async (option) => {
        await productOperations.createOptionGroupItem(
          finishingOptionGroup.id,
          option.id,
        );
      });
      await basketOperations.createBasketItem(
        req.user.id,
        productId,
        optionGroup.id,
        finishingOptionGroup.id,
        quantityId,
        price,
        subTotal,
        sale ? sale.id : null,
        promoCode ? promoCode.id : null,
      );
    } else {
      await basketOperations.createBasketItem(
        req.user.id,
        productId,
        optionGroup.id,
        null,
        quantityId,
        price,
        subTotal,
        sale ? sale.id : null,
        promoCode ? promoCode.id : null,
      );
    }
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }

  await transaction.commit();

  return res.status(201).json({});
}

async function getBasketPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const { checkoutMessage } = req.session;
  req.session.checkoutMessage = false;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('basket', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    checkoutMessage,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function deleteBasketItem(req, res) {
  const { basketItemId } = req.body;

  const transaction = await models.sequelize.transaction();

  try {
    await basketOperations.removeBasketItem(basketItemId);
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }

  await transaction.commit();

  return res.status(200).json({});
}

async function updateBasketQuantity(req, res) {
  const { basketItemId } = req.body;
  const { quantityId } = req.body;

  const transaction = await models.sequelize.transaction();

  try {
    await basketOperations.updateQuantityPriceForBasketItem(
      basketItemId,
      quantityId,
    );
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }

  await transaction.commit();

  return res.status(200).json({});
}

async function getDesignUploadPage(req, res) {
  const { basketItemId } = req.params;
  const basketItem = await basketOperations.getBasketItem(basketItemId);

  if (basketItem.accountFk !== req.user.id) return res.redirect('/basket');

  const product = await productOperations.getProductById(basketItem.productFk);
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  const fileGroupItems = await basketOperations.getFileGroupItemsForBasketItem(
    basketItem,
  );
  return res.render('designUpload', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    allProductTypes,
    basketItems,
    basketItem,
    product,
    fileGroupItems,
    displayCookieMessage,
  });
}

async function uploadDesign(req, res) {
  const { basketItemId } = req.body;
  const { file } = req.files;

  const transaction = await models.sequelize.transaction();

  try {
    const { fileGroupItem } = await basketOperations.uploadDesignForBasketItem(file, basketItemId);
    await transaction.commit();
    return res.status(200).json({ id: fileGroupItem.id });
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }
}

async function removeFileGroupItem(req, res) {
  const { basketItemId } = req.body;
  const { fileGroupItemId } = req.body;

  const transaction = await models.sequelize.transaction();

  try {
    await basketOperations.removeFileGroupItem(fileGroupItemId, basketItemId);
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({});
  }

  await transaction.commit();

  return res.status(200).json({});
}

async function checkoutPage(req, res) {
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const deliveryOptions = await deliveryOperations.getDeliveryOptionsForProductIds(
    basketItems.basketItems.map((b) => b.productFk),
  );

  if (deliveryOptions === null) return res.redirect('/basket');

  const { displayCookieMessage } = req.body;
  const { guestEmail } = req.session;

  return res.render('checkout', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    allProductTypes,
    basketItems,
    guestEmail,
    deliveryOptions,
    displayCookieMessage,
  });
}

async function checkoutLoginPage(req, res) {
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  res.render('checkoutLogin', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    displayCookieMessage,
  });
}

async function checkoutAsGuest(req, res) {
  const { email } = req.body;

  // const account = await accountOperations.findAccountByEmail(email);
  // if(account !== null) {
  //     // account already signed up
  //     // ask the user to please sign in
  //     // direct to login page so normal
  //     return loginController.render_checkoutLogin(req, res, 'An account with this email already exist. Please log in.');
  // }

  req.session.checkoutAsGuestFl = true;
  req.session.guestEmail = email;
  res.redirect('/checkout');
}

async function handleSetPurcharseBasketForBasketItem(
  basketItem,
  lineItems,
  purchaseBasketId,
) {
  const { quantity } = basketItem;
  const amount = parseFloat(basketItem.subTotal) * 100;
  const lineItem = {
    name: `${basketItem.name} - (${quantity} units)`,
    amount,
    currency: 'gbp',
    quantity: 1,
  };

  lineItems.push(lineItem);

  await basketOperations.setPurchaseBasketForBasketItem(
    basketItem.id,
    purchaseBasketId,
  );
}

async function checkout(req, res) {
  const { url } = req.body;
  const accountId = req.user.id;
  const { fullName } = req.body;
  const { email } = req.body;
  const { phoneNumber } = req.body;
  const { deliveryName } = req.body;

  if (deliveryName !== 'Standard' && deliveryName !== 'Collection' && deliveryName !== 'Express') {
    const message = `Delivery name ${deliveryName} is not valid.`;
    logger.error(message);
    return res.status(400).json(message);
  }
  // const { deliveryTypeId } = req.body;

  // const deliveryType = await deliveryOperations.getDeliveryType(deliveryTypeId);
  let shippingDetail = null;

  const { basketItems, subTotalCost, totalCost } = await basketOperations.getAllBasketItemsForCheckout(
    accountId,
  );

  const deliveryOptions = await deliveryOperations.getDeliveryOptionsForProductIds(basketItems.map((b) => b.productFk));
  let deliveryPrice;

  if (deliveryName === 'Standard') {
    deliveryPrice = deliveryOptions.standardPrice;
  } else if (deliveryName === 'Express') {
    deliveryPrice = deliveryOptions.expressPrice;
  } else {
    deliveryPrice = '0.00';
  }

  // const { subTotal, total } = basketOperations.getTotalsFromBasketItems(basketItems);
  const newTotal = parseFloat(subTotalCost) + parseFloat(deliveryPrice);

  const transaction = await models.sequelize.transaction();
  const lineItems = [];
  let purchaseBasket;
  try {
    if (deliveryName !== 'Collection') {
      // createShippingDetail

      const { addressLine1 } = req.body;
      const { addressLine2 } = req.body;
      const { city } = req.body;
      const { postCode } = req.body;

      shippingDetail = await deliveryOperations.createShippingDetail(
        accountId,
        fullName,
        email,
        addressLine1,
        addressLine2,
        city,
        postCode,
        phoneNumber,
        true,
        false,
      );
    }

    purchaseBasket = await orderOperations.createPurchaseBasket(
      accountId,
      fullName,
      email,
      phoneNumber,
      totalCost,
      newTotal,
      shippingDetail,
      deliveryName,
      deliveryPrice,
    );

    await Promise.all(
      basketItems.map((basketItem) => handleSetPurcharseBasketForBasketItem(
        basketItem,
        lineItems,
        purchaseBasket.id,
      )),
    );

    const amount = parseInt(parseFloat(deliveryPrice) * 100, 10);
    const lineItem = {
      name: deliveryName,
      amount,
      currency: 'gbp',
      quantity: 1,
    };

    lineItems.push(lineItem);
  } catch (err) {
    logger.error(err);
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
    success_url: `${url}/purchase-successful/${purchaseBasket.id}`,
    cancel_url: `${url}/checkout`,
  });

  await orderOperations.updatePurchaseBasketWithOrderId(
    purchaseBasket.id,
    session.payment_intent,
  );

  return res.status(201).json({ session });
}

async function sessionCompleted(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    logger.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const purchaseBasketId = session.client_reference_id;

    const now = new Date();
    const transaction = await models.sequelize.transaction();

    try {
      await orderOperations.completePurchaseBasket(purchaseBasketId, now);
      await updateSalesUsedCountForOrder(purchaseBasketId);
      await queueOperations.addSendPurchaseEmail(purchaseBasketId);

      const orderDetails = await orderOperations.getSuccessfulOrderForPurchaseBasketId(
        purchaseBasketId,
      );
      const text = `${orderDetails.fullName} just made order of £${parseFloat(
        orderDetails.total,
      ).toFixed(2)}`;
      const link = `/admin-dashboard/order/${orderDetails.id}`;
      await accountOperations.createNotificationForAdminAccounts(text, link);
    } catch (err) {
      logger.error(err);
      await transaction.rollback();
      throw new Error(
        'purchasebasket update for orderNumber '
          + `blu-${purchaseBasketId} failed`,
      );
    }

    await transaction.commit();

    return res.json({ received: true });
  }

  return res.status(400).send('Webhook Error: undefined');
}

async function purchaseSuccessfulPage(req, res) {
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  const purchaseBasket = await basketOperations.getPurchaseBasketById(
    req.params.id,
  );
  res.render('purchaseSuccessful', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    basketItems,
    orderNumber: purchaseBasket.orderNumber,
    allProductTypes,
    displayCookieMessage,
  });
}

module.exports = {
  getShopTypePage,
  getProductPage,
  getQuantityPriceTableDetails,
  getPricingMatrixOptionTypesAndOptionsForProduct,
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
  purchaseSuccessfulPage,
  getFinishingMatrixOptionTypesAndOptionsForProduct,
  editBasketItem,
};
