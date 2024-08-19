const logger = require('pino')();
const passport = require('passport');
const { isEmpty } = require('lodash');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const companyInfo = require('../utility/company/companyInfo');
const { validateUser } = require('../validators/signup');
const { hasSaleNotChanged, validateDate, validateSale } = require('../validators/sale');
const accountOperations = require('../utility/account/accountOperations');
const productOperations = require('../utility/products/productOperations');
const deliveryOperations = require('../utility/delivery/deliveryOperations');
const basketOperations = require('../utility/basket/basketOperations');
const emailOperations = require('../utility/email/emailOperations');
const homePageOperations = require('../utility/homePage/homePageOperations');
const orderOperations = require('../utility/order/orderOperations');
const refundOperations = require('../utility/refund/refundOperations');
const faqOperations = require('../utility/faq/faqOperations');
const salesOperations = require('../utility/sales/salesOperations');
const utilityHelper = require('../utility/general/utilityHelper');

const models = require('../models');

async function getNotificationDetails(accountId) {
  let notifications = await accountOperations.getNotificationsForAccount(accountId);
  const numberOfNotifications = notifications.length;
  notifications = notifications.slice(0, 3);
  notifications = notifications.map((n) => ({
    id: n.id,
    link: n.link,
    text: n.text,
    longAgo: utilityHelper.getTimeDifference(n.createdDttm),
  }));

  return { numberOfNotifications, notifications };
}

function getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions) {
  const result = [];

  Object.keys(optionTypesAndOptions).forEach((key) => {
    const optionTypeAndOptions = optionTypesAndOptions[key];
    result.push(...optionTypeAndOptions.map((o) => o.optionId.toString()));
  });

  return result;
}

function hasNewMatrixBeenCreated(newOptions, existingOptions, newQuantities, exisitingQuantities) {
  const optionsTheSame = utilityHelper.hasTheSameItems(newOptions, existingOptions);
  const quantitiesTheSame = utilityHelper.hasTheSameItems(newQuantities, exisitingQuantities);

  return optionsTheSame === false || quantitiesTheSame === false;
}

function addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, request) {
  for (let i = 1; i < 6; i += 1) {
    const itemRemove = request[`${i}Remove`] ? JSON.parse(request[`${i}Remove`]) : false;
    const itemPath = request[`${i}Path`];
    const iString = i.toString();
    if (itemRemove === true) {
      s3PathMap.set(iString, null);
    } else {
      const uploadedPath = s3PathMap.get(iString);
      if (uploadedPath === undefined && itemPath !== 'null') {
        s3PathMap.set(iString, itemPath);
      }
    }
  }
}

async function renderSetup2fa(req, res, error) {
  const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(req.user.id);

  let secret;
  let qrCode;
  if (twoFactorAuth === null) {
    const qrInfo = GoogleAuthenticator.register(`${companyInfo.getCompanyDetails().COMPANY_NAME} (${req.user.email})`);
    secret = qrInfo.secret;
    qrCode = qrInfo.qr;

    await accountOperations.createTwoFactorAuthForAccountId(req.user.id, secret, qrCode);
  } else {
    secret = twoFactorAuth.secret;
    qrCode = twoFactorAuth.qrCode;
  }

  const data = {
    user: req.user,
    secret,
    qrCode,
    companyDetails: companyInfo.getCompanyDetails(),
  };
  if (error) data.error = 'Code entered was incorrect. Please scan the new code in your authenticator app and enter the code.';
  res.render('setup2fa', data);
}

async function rerenderCreateAdmin(errors, req, res) {
  res.render('createAdmin', {
    defaultPassword: process.env.LOGIN_PASSWORD,
    errors,
    formData: req.body,
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAdminDashboardPage(req, res) {
  const { message } = req.session;
  req.session.message = undefined;

  const orderDetailsInLastMonth = await orderOperations.getOrderDetailsInLastMonth();
  const newCustomersInTheLastWeek = await accountOperations.getNewCustomersInTheLastWeek();
  res.render('adminDashboard', {
    user: req.user,
    message,
    orderDetailsInLastMonth,
    newCustomersInTheLastWeek,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getCreateAdminPage(req, res) {
  res.render('createAdmin', {
    defaultPassword: process.env.LOGIN_PASSWORD,
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function createAdmin(req, res) {
  return validateUser(req).then(async (errors) => {
    if (!isEmpty(errors)) {
      // reRender the sign up page with the errors
      logger.error(errors);
      rerenderCreateAdmin(errors, req, res);
    } else {
      await accountOperations.createAccount(1, req.body.email, req.body.name, req.body.phoneNumber, req.body.password);

      req.session.message = 'Admin account created!';
      res.redirect('/admin-dashboard');
    }
  });
}

async function getSetup2faPage(req, res) {
  await renderSetup2fa(req, res, false);
}

async function setup2fa2Registration(req, res, next) {
  passport.authenticate('register', async (err, account) => {
    if (err) {
      return next(err);
    }

    if (!account) {
      return renderSetup2fa(req, res, true);
    }

    await accountOperations.complete2FaSetupForAccountId(account.id, req.body.secret);

    req.session.message = '2FA has been successfully set up';
    return res.redirect('/admin-dashboard');
  })(req, res, next);
}

async function getProductsPage(req, res) {
  const products = await productOperations.getAllProducts();
  res.render('adminProducts', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    products,
  });
}

async function getProductPage1(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);

  const productTypes = await productOperations.getAllActiveProductTypes();

  let quantityGroup = null;
  if (product) {
    quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  }

  const priceMatrix = product ? await productOperations.getPriceMatrixForProductId(product.id) : null;
  const finishingMatrices = product ? await productOperations.getFinishingMatricesForProductId(product.id) : [];
  const productDeliveries = product ? await deliveryOperations.getProductDeliveriesForProduct(product.id) : [];
  const isValid = product ? await productOperations.isProductValid(product) : { isValid: false };
  const { message } = req.session;
  req.session.message = undefined;
  res.render('productPage1', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    productTypes,
    product,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
    message,
  });
}

async function getProductPage2(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);

  if (product === null) {
    // message
    return res.redirect('/admin-dashboard/products');
  }
  const quantities = await productOperations.getAllQuantities();
  const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);
  const { message } = req.session;
  req.session.message = undefined;
  return res.render('productPage2', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantities,
    selectedQuantities,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
    message,
  });
}

async function getProductPage3(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);

  if (product === null) {
    // message
    return res.redirect('/admin-dashboard/products');
  }
  const optionTypes = await productOperations.getOptionTypesNotUsedByFinishingMatrixForProduct(product.id);

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

  const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(product.id);
  const optionTypesAndOptionsWithAllOptions = await productOperations.addAllOptionTypesToOptionTypesAndOptionJson(
    optionTypesAndOptions,
  );
  const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(product.id);
  const selectedOptionTypes = matrixRows.length === 0 ? [] : matrixRows[0][0].options.map((o) => o.optionType);
  const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);

  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);

  const { message } = req.session;
  req.session.message = undefined;
  return res.render('productPage3', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    optionTypes,
    selectedOptionTypes,
    optionTypesAndOptions: optionTypesAndOptionsWithAllOptions,
    selectedQuantities,
    matrixRows,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
    message,
  });
}

async function getProductPage4(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);

  if (product === null) {
    // message
    return res.redirect('/admin-dashboard/products');
  }
  const optionTypes = await productOperations.getOptionTypesNotUsedByPricingMatrixForProduct(product.id);

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

  const optionTypesAndOptions = await productOperations.getFinishingMatrixOptionTypesAndOptionsForProduct(product.id);

  const optionTypeAndOptionsWithAllOptions = await productOperations.addAllOptionTypesToOptionTypesAndOptionToFinishingJson(
    optionTypesAndOptions,
  );

  const matrixRows = [];
  const selectedOptionTypes = [];
  const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(product.id);

  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);
  const { message } = req.session;
  req.session.message = undefined;
  return res.render('productPage4', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    optionTypes,
    selectedOptionTypes,
    optionTypesAndOptions: optionTypeAndOptionsWithAllOptions,
    selectedQuantities,
    matrixRows,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
    message,
  });
}

async function getProductPage5(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);

  if (product === null) {
    // message
    return res.redirect('/admin-dashboard/products');
  }

  const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);

  const { message } = req.session;
  req.session.message = undefined;
  return res.render('productPage5', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    deliveryTypes,
    isValid: isValid.isValid,
    message,
  });
}

// async function getProductPage6(req, res) {
//   const { id } = req.params;
//   const product = await productOperations.getProductById(id);

//   if (product === null) {
//     // message
//     return res.redirect("/admin-dashboard/products");
//   }

//   const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
//   const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
//   const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
//   const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
//   const isValid = await productOperations.isProductValid(product);
//   // const sale = await productOperations.getSaleForProductId(product.id);

//   const { message } = req.session;
//   req.session.message = undefined;
//   return res.render("productPage6", {
//     user: req.user,
//     companyDetails: companyInfo.getCompanyDetails(),
//     product,
//     quantityGroup,
//     priceMatrix,
//     finishingMatrices,
//     productDeliveries,
//     isValid: isValid.isValid,
//     // sale,
//     message,
//   });
// }

async function verifyQuantities(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const { quantities } = req.query;
  if (quantities === undefined) return res.status(400).json({ error: 'No quantities set.' });

  const parsedQuantities = JSON.parse(req.query.quantities);
  if (parsedQuantities.length === 0) return res.status(400).json({ error: 'No quantities set.' });

  const verification = await productOperations.verifyQuantities(productId, parsedQuantities);
  return res.status(200).json(verification);
}

async function getPriceMatrixRows(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(productId);
  return res.status(200).json(matrixRows);
}

async function continuePage3(req, res) {
  const productId = req.params.id;
  const rows = JSON.parse(req.body.rows);
  const options = utilityHelper.parseCommaSeperatedText(req.body.options);

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const quantityGroups = rows.map((r) => r.quantityGroup);
  const pricesNotSet = quantityGroups.filter((q) => q.prices === '');

  if (pricesNotSet.length > 0) {
    return res.status(400).json({ error: 'All prices must be set to continue.' });
  }
  // validate row values
  // make sure every single one is present else fail

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);

  if (priceMatrix) {
    // update
    await productOperations.deletePriceMatrixForProduct(productId);
  }

  const newPriceMatrix = await productOperations.createPrintingAttributes(productId, options, rows, true);

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  return res.status(200).json({ newPriceMatrix });
}

async function continuePage4(req, res) {
  const productId = req.params.id;
  const matrices = JSON.parse(req.body.matrices);

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const isComplete = await productOperations.isAllFinishingMatricesComplete(matrices);
  if (!isComplete) {
    return res.status(400).json({ error: 'All prices must be set to continue.' });
  }

  // update
  await productOperations.deleteFinishingMatricesForProduct(product.id);
  await productOperations.createFinishingMatrices(productId, matrices);

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);
  return res.status(200).json({});
}

async function savePrintingAttributes(req, res) {
  const productId = req.params.id;
  const rows = JSON.parse(req.body.rows);
  const options = utilityHelper.parseCommaSeperatedText(req.body.options);

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
  // need validation to determine whether its completed
  if (priceMatrix) {
    // update
    await productOperations.deletePriceMatrixForProduct(productId);
    await productOperations.createPrintingAttributes(productId, options, rows);
  } else {
    // create option group
    // items
    // and price matrix

    await productOperations.createPrintingAttributes(productId, options, rows);
  }

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  return res.status(200).json({});
}

async function getProductWithNoActiveSalesForSale(req, res) {
  const { id, fromDt, toDt } = req.params;
  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const currentProducts = await salesOperations.getProductsForSaleIdWhichOverlapDates(id, fromDt, toDt);
  const otherProducts = await salesOperations.getProductsWithNoActiveSale(fromDt, toDt);

  const result = [...currentProducts, ...otherProducts];
  return res.status(200).json(result);
}

async function getProductWithNoActiveSales(req, res) {
  const { fromDt, toDt } = req.params;

  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const products = await salesOperations.getProductsWithNoActiveSale(fromDt, toDt);

  return res.status(200).json(products);
}

async function createSale(req, res) {
  const errors = validateSale(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const {
    name, fromDt, toDt, description, percentage, ids,
  } = req.body;
  const createdSale = await salesOperations.createSale(name, fromDt, toDt, description, percentage, ids);

  return res.status(200).json({ id: createdSale.id });
}

async function getSalePage(req, res) {
  const { id } = req.params;

  const sale = await salesOperations.getSaleById(id);
  if (!sale) {
    return res.redirect('/admin-dashboard');
  }

  return res.render('adminSale', {
    sale,
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function updateSale(req, res) {
  const { id } = req.params;

  const sale = await salesOperations.getSaleById(id);

  if (!sale) {
    return res.status(400).json({ error: 'No sale found' });
  }

  const errors = validateSale(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  if (await hasSaleNotChanged(req.body, sale)) {
    return res.status(400).json({ errors: { noChange: true } });
  }

  const {
    name, fromDt, toDt, description, percentage, ids,
  } = req.body;
  const newSale = await salesOperations.updateSale(sale.id, name, fromDt, toDt, description, percentage, ids);

  return res.status(200).json({ id: newSale.id });
}

async function getSaleProducts(req, res) {
  const { id } = req.params;

  const saleProducts = await salesOperations.getSaleProductsForSaleId(id);
  const productIds = saleProducts.map((saleProduct) => saleProduct.productFk);
  return res.status(200).json({ productIds });
}

async function deleteSale(req, res) {
  const { id } = req.params;

  const basketItems = await basketOperations.getBasketItemsWithSaleId(id);
  if (basketItems.length === 0) {
    await salesOperations.deleteSaleById(id);
    return res.status(200).json({});
  }

  await basketOperations.deleteSalesFromBasketItems(id);

  await salesOperations.deactivateSale(id);

  return res.status(200).json({});
}

async function saveDeliveryOptions(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const deliveryOptions = JSON.parse(req.body.deliveryOptions);

  const invalidOptions = deliveryOptions.filter((d) => d.price === '');

  if (invalidOptions.length > 0) {
    return res.status(400).json({ error: 'All delivery option prices must be set to continue.' });
  }

  const existingDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);

  if (existingDeliveries.length > 0) {
    await deliveryOperations.updateProductDeliveriesForProduct(productId, deliveryOptions);
  } else {
    await deliveryOperations.createDeliveryOptionsForProduct(productId, deliveryOptions);
  }

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  return res.status(200).json({});
}

async function saveFinishingAttributes(req, res) {
  const productId = req.params.id;
  const matrices = JSON.parse(req.body.matrices);

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);

  if (finishingMatrices.length > 0) {
    // update
    await productOperations.deleteFinishingMatricesForProduct(product.id);
  }
  await productOperations.createFinishingMatrices(productId, matrices);
  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  return res.status(200).json({});
}

async function getQuantities(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const quantities = await productOperations.getQuantitiesForProduct(product.id);

  return res.status(200).json(quantities);
}

async function saveQuantities(req, res) {
  const productId = req.params.id;
  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found. Contact Support' });
  }

  const quantities = utilityHelper.parseCommaSeperatedText(req.body.quantities);
  const override = req.body.override === 'true';

  const {
    valid, message, warning, create,
  } = await productOperations.verifyQuantities(productId, quantities);
  if (!override) {
    if (!valid) {
      return res.status(400).json({ error: message });
    }

    if (warning) {
      return res.status(400).json({ error: message });
    }
  }

  if (!create) {
    // update quantities for group
    const quantityGroup = await productOperations.getQuantityGroupForProductId(productId);
    await productOperations.updateQuantitiesForQuantityGroup(quantityGroup, quantities);
    // deactivate product
    await productOperations.deactivateProduct(product.id, false);
  } else {
    // new
    // create
    await productOperations.createQuantityGroupAndSetQuantities(productId, quantities);
  }

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  return res.status(200).json({});
}

async function getOptionsForOptionType(req, res) {
  const { optionTypeId } = req.query;
  const options = await productOperations.getOptionsForOptionTypeId(optionTypeId);

  return res.status(200).json(options);
}

async function getProductPage(req, res) {
  const productId = req.params.id;
  // need to get all the details for product
  const productTypes = await productOperations.getAllActiveProductTypes();
  const optionTypes = await productOperations.getAllOptionTypes();
  const quantities = await productOperations.getAllQuantities();
  const product = await productOperations.getProductById(productId);
  const { message } = req.session;
  req.session.message = undefined;
  // TODO
  if (product === null) return res.redirect('/admin-dashboard');

  const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
  const optionTypeAndOptionsWithAllOptions = await productOperations.addAllOptionTypesToOptionTypesAndOptionJson(
    optionTypesAndOptions,
  );
  const selectedQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);

  const matrixRows = await productOperations.getPriceMatrixDetailsForProductId(productId);
  const selectedOptionTypes = matrixRows[0][0].options.map((o) => o.optionType);

  const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(productId);
  return res.render('adminProduct', {
    user: req.user,
    product,
    productTypes,
    quantities,
    optionTypes,
    optionTypesAndOptions: optionTypeAndOptionsWithAllOptions,
    selectedQuantities,
    matrixRows,
    message,
    selectedOptionTypes,
    productDeliveries,
    deliveryTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getSalesPage(req, res) {
  const sales = await salesOperations.getAllSales();
  res.render('adminSales', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    sales,
  });
}

async function continuePage1(req, res) {
  const { productName } = req.body;
  const { productTypeId } = req.body;
  const { files } = req;
  const { description } = req.body;
  const { subDescription } = req.body;
  const { subDescriptionTitle } = req.body;
  const bulletPoints = utilityHelper.parseCommaSeperatedText(req.body.bulletPoints);
  const { productId } = req.body;

  const productDetails = {
    name: productName,
    productTypeFk: productTypeId,
    description,
    subDescription,
    subDescriptionTitle,
  };
  let s3PathMap = new Map();
  if (files !== null && files !== undefined) {
    s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
  }
  // verify productName is not empty
  if (!productName || productName === '') {
    return res.status(400).json({ error: "'Product Name' must be set to save." });
  }

  // validate
  addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);
  const updatedProductDetails = productOperations.updateProductDetailsWithPicturesAndBulletPoints(
    s3PathMap,
    productDetails,
    bulletPoints,
  );

  const errors = await productOperations.validateProductInformationDetails(updatedProductDetails);
  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }
  if (productId === 'undefined' || productId === undefined) {
    // create product
    updatedProductDetails.deleteFl = true;

    updatedProductDetails.versionNo = 1;
    const product = await productOperations.createProduct(updatedProductDetails, s3PathMap, bulletPoints);
    // req.session.message = 'Saved' ;
    return res.status(201).json({ id: product.id });
  }
  // update existing product
  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  updatedProductDetails.s3PathMap = s3PathMap;
  updatedProductDetails.bulletPoints = bulletPoints;
  updatedProductDetails.productId = productId;
  await productOperations.updateProduct(updatedProductDetails);

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  // req.session.message = 'Saved';
  return res.status(200).json({ id: productId });
}

async function createProductFromProductDetails(productDetails, bulletPoints, files) {
  const updatedProductDetails = { ...productDetails, deleteFl: true, versionNo: 1 };
  const s3PathMap = files !== null && files !== undefined
    ? await productOperations.uploadPictures('Products/', updatedProductDetails.name, files)
    : new Map();
  const product = await productOperations.createProduct(updatedProductDetails, s3PathMap, bulletPoints);
  return product;
}

async function savePage1(req, res) {
  const { productName } = req.body;
  const { productTypeId } = req.body;
  const { files } = req;
  const { description } = req.body;
  const { subDescription } = req.body;
  const { subDescriptionTitle } = req.body;
  const bulletPoints = utilityHelper.parseCommaSeperatedText(req.body.bulletPoints);
  const { productId } = req.body;
  const productDetails = {
    name: productName,
    productTypeFk: productTypeId,
    description,
    subDescription,
    subDescriptionTitle,
  };

  // verify productName is not empty
  if (!productName || utilityHelper.isEmptyString(productName)) {
    return res.status(400).json({ error: "'Product Name' must be set to save." });
  }

  if (productId === 'undefined' || productId === undefined) {
    // create product
    const product = await createProductFromProductDetails(productDetails, bulletPoints, files);
    req.session.message = 'Saved';
    return res.status(201).json({ id: product.id });
  }

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const s3PathMap = files !== null && files !== undefined
    ? await productOperations.uploadPictures('Products/', productName, files)
    : new Map();
  // update existing product
  addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);

  productDetails.s3PathMap = s3PathMap;
  productDetails.bulletPoints = bulletPoints;
  productDetails.productId = productId;
  await productOperations.updateProduct(productDetails);

  const updatedProduct = await productOperations.getProductById(productId);
  const isValid = await productOperations.isProductValid(updatedProduct);
  await productOperations.setProductStatusComplete(productId, isValid.isValid);

  req.session.message = 'Saved';
  return res.status(200).json({ id: productId });
}

async function getProductTypesPage(req, res) {
  const productTypes = await productOperations.getAllProductTypesWithNumberOfProducts();
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminProductTypes', {
    user: req.user,
    message,
    productTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getTemplatesPage(req, res) {
  const templates = await productOperations.getTemplates();
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminTemplates', {
    user: req.user,
    message,
    templates,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getFaqsPage(req, res) {
  const faqs = await faqOperations.getFaqs();
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminFaqs', {
    user: req.user,
    message,
    faqs,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAddFaqPage(req, res) {
  const faqTypes = await faqOperations.getFaqTypes();
  const { message } = req.session;
  req.session.message = undefined;

  res.render('addFaq', {
    user: req.user,
    faqTypes,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function addFaq(req, res) {
  const { question } = req.body;
  const { answer } = req.body;
  const deleteFl = req.body.deleteFl === 'true';
  const { faqTypeId } = req.body;

  const existingFaq = await faqOperations.getFaqByQuestion(question);

  if (existingFaq !== null) {
    return res.status(400).json({});
  }

  await faqOperations.createFaq(question, answer, faqTypeId, deleteFl);
  req.session.message = 'Question created!';
  return res.status(201).json({});
}

async function getAddTemplatePage(req, res) {
  const { message } = req.session;
  req.session.message = undefined;
  const sizes = await productOperations.getAvailableSizeOptionsForNewTemplate();

  res.render('addTemplate', {
    user: req.user,
    message,
    sizes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function addTemplate(req, res) {
  const { files } = req;
  const s3PathMap = await productOperations.uploadPictures('Templates/', 'Size', files);
  const body = {
    bleedAreaWidth: req.body.bleedAreaWidth,
    bleedAreaHeight: req.body.bleedAreaHeight,
    trimWidth: req.body.trimWidth,
    trimHeight: req.body.trimHeight,
    safeAreaHeight: req.body.safeAreaHeight,
    safeAreaWidth: req.body.safeAreaWidth,
    deleteFl: req.body.deleteFl === 'true',
    sizeOptionFk: req.body.size,
    versionNo: 1,
    pdfPath: s3PathMap.get('pdfTemplate'),
    jpegPath: s3PathMap.get('jpgTemplate'),
  };

  const transaction = await models.sequelize.transaction();

  try {
    await productOperations.createTemplate(body);
    await transaction.commit();
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json(err);
  }

  req.session.message = 'Template created!';
  return res.status(201).json({});
}

async function editTemplate(req, res) {
  const templateId = req.params.id;

  const body = {
    bleedAreaWidth: req.body.bleedAreaWidth,
    bleedAreaHeight: req.body.bleedAreaHeight,
    trimWidth: req.body.trimWidth,
    trimHeight: req.body.trimHeight,
    safeAreaHeight: req.body.safeAreaHeight,
    safeAreaWidth: req.body.safeAreaWidth,
    deleteFl: req.body.deleteFl === 'true',
    versionNo: models.sequelize.literal('versionNo + 1'),
  };

  const { files } = req;
  if (files) {
    const s3PathMap = await productOperations.uploadPictures('Templates/', 'Size', files);

    if (s3PathMap.get('pdfTemplate')) {
      body.pdfPath = s3PathMap.get('pdfTemplate');
    }

    if (s3PathMap.get('jpgTemplate')) {
      body.jpegPath = s3PathMap.get('jpgTemplate');
    }
  }

  const transaction = await models.sequelize.transaction();

  try {
    await productOperations.updateTemplate(templateId, body);
    await transaction.commit();
    req.session.message = 'Template updated!';
    return res.status(200).json({});
  } catch (err) {
    logger.error(err);
    await transaction.rollback();

    return res.status(400).json({});
  }
}

async function editFaq(req, res) {
  const faqId = req.params.id;
  const { question } = req.body;
  const { answer } = req.body;
  const deleteFl = req.body.deleteFl === 'true';
  const { faqTypeId } = req.body;

  const faq = await faqOperations.getFaq(faqId);

  if (faq === null) {
    return res.status(400).json({ error: 'No Question to update' });
  }

  // findQuestionName
  const faqWithQuestion = await faqOperations.getFaqByQuestion(question);

  if (faqWithQuestion && faqWithQuestion.id !== faqId) {
    return res.status(400).json({ error: 'Question Name already exists' });
  }

  const transaction = await models.sequelize.transaction();

  try {
    await faqOperations.updateFaq(question, answer, deleteFl, faqTypeId, faqId);
    await transaction.commit();
    req.session.message = 'Question Updated!';
    return res.status(200).json({});
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({ error: err });
  }
}

async function getTemplatePage(req, res) {
  const { id } = req.params;
  const template = await productOperations.getTemplate(id);
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminTemplate', {
    user: req.user,
    template,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getFaqPage(req, res) {
  const { id } = req.params;
  const faq = await faqOperations.getFaq(id);
  const faqTypes = await faqOperations.getFaqTypes();
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminFaq', {
    user: req.user,
    faq,
    faqTypes,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function createProduct(req, res) {
  const { productName } = req.body;
  const { productTypeId } = req.body;
  const rows = JSON.parse(req.body.rows);
  const { files } = req;
  const { description } = req.body;
  const { subDescription } = req.body;
  const { subDescriptionTitle } = req.body;
  const bulletPoints = utilityHelper.parseCommaSeperatedText(req.body.bulletPoints);
  const options = utilityHelper.parseCommaSeperatedText(req.body.options);
  const quantities = utilityHelper.parseCommaSeperatedText(req.body.quantities);
  const deleteFl = JSON.parse(req.body.deleteFl);
  const deliveryOptions = JSON.parse(req.body.deliveryOptions);

  const productDetails = {
    name: productName,
    productTypeFk: productTypeId,
    description,
    subDescription,
    subDescriptionTitle,
    deleteFl,
    versionNo: 1,
  };

  const transaction = await models.sequelize.transaction();

  try {
    const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
    const product = await productOperations.createProduct(productDetails, s3PathMap, bulletPoints);

    // create priceMatrix object
    const priceMatrix = await productOperations.createPriceMatrix(product.id, options, quantities);
    await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
    await deliveryOperations.createDeliveryOptionsForProduct(product.id, deliveryOptions);
    req.session.message = `Product ${product.name} has been successfully created`;
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    req.session.message = 'Error Creating product, please contact support';
    return res.status(500).send(err);
  }

  await transaction.commit();
  return res.status(201).json({});
}

async function getOptionTypesAndOptionForProduct(req, res) {
  const { productId } = req.query;
  const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
  const parsedOptionTypesAndOptions = await productOperations.parseOptionTypesAndOption(optionTypesAndOptions);

  res.status(200).json(parsedOptionTypesAndOptions);
}

async function editProduct(req, res) {
  const { productId } = req.body;
  const { productName } = req.body;
  const { productTypeId } = req.body;
  const rows = JSON.parse(req.body.rows);
  const { files } = req;
  const { description } = req.body;
  const { subDescription } = req.body;
  const { subDescriptionTitle } = req.body;
  const bulletPoints = utilityHelper.parseCommaSeperatedText(req.body.bulletPoints);
  const options = utilityHelper.parseCommaSeperatedText(req.body.options);
  const quantities = utilityHelper.parseCommaSeperatedText(req.body.quantities);
  const deleteFl = JSON.parse(req.body.deleteFl);
  const deliveryOptions = JSON.parse(req.body.deliveryOptions);

  // const transaction = await models.sequelize.transaction();

  try {
    const s3PathMap = await productOperations.uploadPictures('Products/', productName, files);
    addToS3PathMapPicturesThatNeedToBeRemoved(s3PathMap, req.body);

    const productDetails = {
      productId,
      productName,
      productTypeId,
      description,
      subDescription,
      subDescriptionTitle,
      bulletPoints,
      s3PathMap,
      deleteFl,
    };
    await productOperations.updateProduct(productDetails);

    const optionTypesAndOptions = await productOperations.getPricingMatrixOptionTypesAndOptionsForProduct(productId);
    const existingOptionIds = getOptionsIdsFromOptionTypesAndOptionsMap(optionTypesAndOptions);
    const exisitingQuantities = await productOperations.getSelectedQuantitiesForProductById(productId);
    const existingQuantityIds = exisitingQuantities.map((q) => q.id.toString());
    await deliveryOperations.updateProductDeliveriesForProduct(productId, deliveryOptions);

    if (hasNewMatrixBeenCreated(options, existingOptionIds, quantities, existingQuantityIds)) {
      // delete active priceMatrix For product
      await productOperations.deletePriceMatrixForProduct(productId);
      const priceMatrix = await productOperations.createPriceMatrix(productId, options, quantities);
      await productOperations.createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
    } else {
      // then just update
      await productOperations.updatePriceMatrixRowPrices(rows);
    }

    req.session.message = `Product ${productName} has been successfully updated`;
  } catch (err) {
    logger.error(err);
    // await transaction.rollback();
    req.session.message = 'Error Updating product, please contact support';
    return res.status(500).send(err);
  }
  // await transaction.commit();

  return res.status(200).json({});
}

async function getProductTypePage(req, res) {
  const { id } = req.params;
  const productType = await productOperations.getProductTypeById(id);
  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminProductType', {
    user: req.user,
    productType,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function editProductType(req, res) {
  const { productTypeName } = req.body;
  const { productTypeId } = req.body;
  const existingProductType = await productOperations.getProductTypeByType(productTypeName);

  if (existingProductType && existingProductType.id !== Number(productTypeId)) {
    return res.status(400).json({ error: 'Product Type with this name already exists.' });
  }

  const { files } = req;
  const deleteFl = JSON.parse(req.body.deleteFl);

  const transaction = await models.sequelize.transaction();

  try {
    let s3PathMap = null;
    if (files !== null) {
      s3PathMap = await productOperations.uploadPictures('ProductTypes/', productTypeName, files);
    }

    const productTypeDetails = {
      productTypeName,
      productTypeId,
      deleteFl,
    };

    if (s3PathMap !== null) {
      productTypeDetails.bannerPath = s3PathMap.get('banner');
    }

    await productOperations.updateProductType(productTypeDetails);
    req.session.message = `Product Type${productTypeName} has been successfully updated`;
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    req.session.message = 'Error Updating product type, please contact support';
    return res.status(400).send(err);
  }

  await transaction.commit();
  return res.status(200).json({});
}

async function getDeliveryTypes(req, res) {
  const deliveryTypes = await deliveryOperations.getAllActiveDeliveryTypes();
  res.status(200).json({ deliveryTypes });
}

async function getDeliveryType(req, res) {
  const { id } = req.query;
  const deliveryType = await deliveryOperations.getDeliveryType(id);

  res.status(200).json({ deliveryType });
}

async function getAccountsPage(req, res) {
  const accounts = await accountOperations.getAllNonGuestAccounts();

  res.render('adminAccounts', {
    user: req.user,
    accounts,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAccountPage(req, res) {
  const { id } = req.params;
  const account = await accountOperations.getAccountById(id);
  if (account.guestFl === true) return res.redirect('/admin-dashboard/accounts');

  const { message } = req.session;
  req.session.message = undefined;
  return res.render('adminAccount', {
    user: req.user,
    account,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAccountDeletePage(req, res) {
  const { id } = req.params;
  const account = await accountOperations.getAccountById(id);
  if (account.guestFl === true) return res.redirect('/admin-dashboard/accounts');
  const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
  const { message } = req.session;
  req.session.message = undefined;
  return res.render('adminAccountDelete', {
    user: req.user,
    account,
    orders,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAccountEmailsPage(req, res) {
  const { id } = req.params;
  const account = await accountOperations.getAccountById(id);
  if (account.guestFl === true) return res.redirect('/admin-dashboard/accounts');
  const emails = await emailOperations.getEmailsForByEmailAddress(account.email);
  return res.render('adminAccountEmails', {
    user: req.user,
    account,
    emails,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAccountOrdersPage(req, res) {
  const { id } = req.params;
  const account = await accountOperations.getAccountById(id);
  if (account.guestFl === true) return res.redirect('/admin-dashboard/accounts');
  const orders = await orderOperations.getSuccessfulOrdersForAccountId(id);
  return res.render('adminAccountOrders', {
    user: req.user,
    account,
    orders,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAccountOrderPage(req, res) {
  const purchaseBasketId = req.params.id;

  const order = await orderOperations.getSuccessfulOrderForPurchaseBasketId(purchaseBasketId);

  const account = await accountOperations.getAccountById(order.accountFk);
  const { shippingDetailFk } = order;
  const shippingDetail = shippingDetailFk === null ? null : await deliveryOperations.getShippingDetailById(shippingDetailFk);
  const basketItems = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId);
  const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
  const isNewRefundPossible = refundOperations.isRefundPossibleForOrder(refunds, order.total);

  const sales = basketItems
    .filter((b) => b.saleFk !== null)
    .map((item) => ({
      name: `${item.saleName} ${item.percentage}% off`,
      discountAmount: item.price - item.subTotal,
    }));

  const { message } = req.session;
  req.session.message = undefined;

  res.render('adminOrder', {
    user: req.user,
    account,
    order,
    shippingDetail,
    companyDetails: companyInfo.getCompanyDetails(),
    basketItems,
    refunds,
    message,
    isNewRefundPossible,
    sales,
  });
}

async function getOrdersPage(req, res) {
  const orders = await orderOperations.getAllCompletedOrders();
  res.render('adminOrders', {
    user: req.user,
    orders,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getRefundTypes(req, res) {
  const refundTypes = await refundOperations.getRefundTypes();
  res.status(200).json(refundTypes);
}

async function createRefund(req, res) {
  const { refundTypeId } = req.body;

  const purchaseBasketId = req.body.orderId;
  const order = await orderOperations.getSuccessfulOrderForPurchaseBasketId(purchaseBasketId);
  const amount = refundTypeId === 2 ? order.total : req.body.amount;
  const refundAmount = parseFloat(amount) * 100;

  try {
    await stripe.refunds.create({
      payment_intent: order.orderId,
      amount: refundAmount,
    });
  } catch (err) {
    logger.error(err);
    return res.status(400).json({
      error:
        'There was an issue with attempting to make a refund. Either try again or login into your stripe account for more details',
    });
  }

  await refundOperations.createRefund(purchaseBasketId, refundTypeId, refundAmount);

  req.session.message = 'Refund Successful';
  return res.status(200).json({});
}

async function getOustandingAmountOfOrder(req, res) {
  const { purchaseBasketId } = req.query;

  const purchaseBasket = await orderOperations.getSuccessfulOrderForPurchaseBasketId(purchaseBasketId);
  const refunds = await refundOperations.getRefundsForOrder(purchaseBasketId);
  const max = await refundOperations.getMaxRefundPossibleForOrder(refunds, purchaseBasket.total);

  res.status(200).json({ max });
}

async function getNotifications(req, res) {
  const accountId = req.user.id;

  const notificationDetails = await getNotificationDetails(accountId);

  res.status(200).json(notificationDetails);
}

async function deleteNotification(req, res) {
  const { id } = req.body;

  await accountOperations.deleteNotificationById(id);

  res.status(200).json({});
}

async function deleteNotifications(req, res) {
  await accountOperations.deleteAllNotificationsForAccount(req.user.id);
  res.status(200).json({});
}

async function getOptionTypesPage(req, res) {
  const optionTypes = await productOperations.getAllOptionTypes();
  const { message } = req.session;
  req.session.message = undefined;
  res.render('adminOptionTypes', {
    user: req.user,
    optionTypes,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getOptionTypePage(req, res) {
  const { id } = req.params;

  const optionType = await productOperations.getOptionTypeById(id);
  const options = await productOperations.getOptionsForOptionTypeId(id);
  const { message } = req.session;
  req.session.message = undefined;
  res.render('adminOptionType', {
    user: req.user,
    optionType,
    options,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function addOption(req, res) {
  const { optionTypeId } = req.body;
  const { option } = req.body;

  const existingOption = await productOperations.getOptionByNameAndType(option, optionTypeId);

  if (existingOption) {
    return res.status(400).json({
      error: 'Option with this name already exists for this Option Type.',
    });
  }

  await productOperations.createOption(option, optionTypeId);
  req.session.message = 'Option created!';
  return res.status(201).json({});
}

async function addOptionType(req, res) {
  const { optionType } = req.body;

  const existingOptionType = await productOperations.getOptionTypeByName(optionType);

  if (existingOptionType) {
    return res.status(400).json({ error: 'Option Type with this name already exists.' });
  }

  await productOperations.createOptionType(optionType);
  req.session.message = 'Option Type created!';
  return res.status(201).json({});
}

async function getOptionPage(req, res) {
  const { id } = req.params;

  const option = await productOperations.getOptionById(id);

  if (!option) return res.status(400).json({ error: 'Option not found' });

  const optionType = await productOperations.getOptionTypeById(option.optionTypeFk);

  return res.render('adminOption', {
    user: req.user,
    option,
    optionType,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

function getAddProductTypePage(req, res) {
  res.render('addProductType', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAddSalePage(req, res) {
  // const products = await productOperations.getAllProducts();

  res.render('addSale', {
    user: req.user,
    // products,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function addProductType(req, res) {
  const { productTypeName } = req.body;

  const existingProductType = await productOperations.getProductTypeByType(productTypeName);

  if (existingProductType) {
    return res.status(400).json({ error: 'Product Type with this name already exists.' });
  }

  const { files } = req;
  // const deleteFl = JSON.parse(req.body.deleteFl);

  const transaction = await models.sequelize.transaction();

  try {
    let s3PathMap = null;
    if (files !== null) {
      s3PathMap = await productOperations.uploadPictures('ProductTypes/', productTypeName, files);
    }

    const productTypeDetails = {
      productType: productTypeName,
      deleteFl: false,
    };

    if (s3PathMap !== null) {
      productTypeDetails.bannerPath = s3PathMap.get('banner');
    }

    await productOperations.createProductType(productTypeDetails);
    req.session.message = `Product Type${productTypeName} has been successfully created`;
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    req.session.message = 'Error Creating product type, please contact support';
    return res.status(400).send(err);
  }

  await transaction.commit();
  return res.status(201).json({});
}

async function getNavigationBarPage(req, res) {
  const { message } = req.session;
  req.session.message = undefined;

  const productTypes = await productOperations.getAllActiveProductTypes();
  const navigationBarHeaders = await productOperations.getNavigationBarHeaders();
  // const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('navigationBarHeaders', {
    user: req.user,
    navigationBarHeaders,
    productTypes,
    // allProductTypes: allProductTypes,
    message,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function setNavigationBarHeaders(req, res) {
  const ids = [
    Number(req.body.position1),
    Number(req.body.position2),
    Number(req.body.position3),
    Number(req.body.position4),
    Number(req.body.position5),
    Number(req.body.position6),
    Number(req.body.position7),
    Number(req.body.position8),
    Number(req.body.position9),
    Number(req.body.position10),
  ];

  if (!utilityHelper.checkNoDuplicateNonZeroNumbers(ids)) {
    return res.status(400).json({ error: 'You have selected a product type more than once.' });
  }
  const transaction = await models.sequelize.transaction();

  try {
    await productOperations.updateNavigationBarHeaders(ids);
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
    return res.status(400).json({ error: 'Unable to make the update. Contact support.' });
  }

  await transaction.commit();

  req.session.message = 'Navigation Bar Headers Updated!';
  return res.status(200).json({});
}

async function setHomePageBanner(req, res) {
  const { title } = req.body;
  const { description } = req.body;
  const bannerBlob = req?.files?.bannerBlob;
  const { productType } = req.body;

  const homePageBannerSection = await productOperations.getHomePageBannerSection();

  if (productType === 0) {
    return res.status(400).json({ error: 'Product Type must be set.' });
  }
  if (homePageBannerSection === null) {
    if (bannerBlob === undefined) {
      return res.status(400).json({ error: 'Banner Image must be set' });
    }
    const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Banner', req.files);
    await productOperations.createHomePageBannerSection(title, productType, description, s3PathMap.get('banner'));
    req.session.message = 'Home Page Second Banner Section Set Up!';
    return res.status(201).json({});
  }

  const data = {
    title,
    description,
    productTypeFk: productType,
    versionNo: models.sequelize.literal('versionNo + 1'),
  };

  if (bannerBlob !== undefined) {
    const s3PathMap = await productOperations.uploadPictures('HomePage/', 'Banner', req.files);
    data.imagePath = s3PathMap.get('banner');
  }

  await productOperations.updateHomePageBannerSection(data);
  req.session.message = 'Home Page Second Banner Section Updated!';
  return res.status(200).json({});
}

async function setHomePageMainBanner(req, res) {
  const { title } = req.body;
  const { description } = req.body;
  const bannerBlob = req?.files?.bannerBlob;
  const { buttonText } = req.body;

  const homePageMainBannerSection = await productOperations.getHomePageMainBannerSection();

  if (homePageMainBannerSection === null) {
    if (bannerBlob === undefined) {
      return res.status(400).json({ error: 'Banner Image must be set' });
    }
    const s3PathMap = await productOperations.uploadPictures('HomePage/', 'MainBanner', req.files);
    await productOperations.createHomePageMainBannerSection(title, buttonText, description, s3PathMap.get('banner'));
    req.session.message = 'Home Page Main Banner Section Set Up!';
    return res.status(201).json({});
  }

  const data = {
    title,
    description,
    buttonText,
    versionNo: models.sequelize.literal('versionNo + 1'),
  };

  if (bannerBlob !== undefined) {
    const s3PathMap = await productOperations.uploadPictures('HomePage/', 'MainBanner', req.files);
    data.imagePath = s3PathMap.get('banner');
  }

  await productOperations.updateHomePageMainBannerSection(data);
  req.session.message = 'Home Page Main Banner Section Updated!';
  return res.status(200).json({});
}

async function getBannerSectionPage(req, res) {
  const { message } = req.session;
  req.session.message = undefined;
  const productTypes = await productOperations.getAllActiveProductTypes();
  const homePageBannerSection = await productOperations.getHomePageBannerSection();

  res.render('adminBannerSection', {
    user: req.user,
    message,
    productTypes,
    homePageBannerSection,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getMainBannerSectionPage(req, res) {
  const { message } = req.session;
  req.session.message = undefined;
  const homePageMainBannerSection = await productOperations.getHomePageMainBannerSection();

  res.render('adminMainBannerSection', {
    user: req.user,
    message,
    homePageMainBannerSection,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function deactivateAccount(req, res) {
  const accountId = req.params.id;

  await accountOperations.deleteAccount(accountId);
  req.session.message = 'Account Successfully Deactivated!';
  res.status(200).json({});
}

async function reactivateAccount(req, res) {
  const accountId = req.params.id;

  await accountOperations.reactivateAccount(accountId);
  req.session.message = 'Account Successfully Reactivated!';
  res.status(200).json({});
}

async function getDeactivatePage(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.redirect('/admin-dashboard/products');
  }

  // check is active

  // if not do nothing

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);

  return res.render('productDeactivatePage', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
  });
}

async function getActivatePage(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.redirect('/admin-dashboard/products');
  }

  const priceMatrix = await productOperations.getPriceMatrixForProductId(product.id);
  const quantityGroup = await productOperations.getQuantityGroupForProductId(product.id);
  const finishingMatrices = await productOperations.getFinishingMatricesForProductId(product.id);
  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  const isValid = await productOperations.isProductValid(product);

  return res.render('productActivatePage', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDeliveries,
    isValid: isValid.isValid,
  });
  // check is deactive
  // check whether everyting is valid
  // activate
}

async function activate(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  if (product.deleteFl === false) return res.status(400).json({ error: 'Product is already activated' });

  const isValid = await productOperations.isProductValid(product);

  if (!isValid.isValid) {
    return res.status(400).json({ error: `${isValid.page} is not valid.`, page: isValid.page });
  }

  await productOperations.activateProduct(product.id);

  return res.status(200).json({});
}

async function deactivate(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  if (product.deleteFl === true) return res.status(400).json({ error: 'Product already deactive' });

  const isValid = await productOperations.isProductValid(product);
  await productOperations.deactivateProduct(productId, isValid.isValid);

  return res.status(200).json({});
}

async function validate(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  if (product.deleteFl === false) {
    return res.redirect(`/admin-dashboard/product/${productId}/page5`);
  }

  const isValid = await productOperations.isProductValid(product);
  if (!isValid.isValid) {
    const { page } = isValid;

    return res.redirect(`/admin-dashboard/product/${productId}/${page}`);
  }

  return res.redirect(`/admin-dashboard/product/${productId}/activate`);
}

async function getFinishingMatrices(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const finishingMatrices = await productOperations.getFinishingMatricesDetailsForProductId(product.id);
  return res.status(200).json(finishingMatrices);
}

async function getProductDeliveries(req, res) {
  const productId = req.params.id;

  const product = await productOperations.getProductById(productId);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const productDeliveries = await deliveryOperations.getProductDeliveriesForProduct(product.id);
  return res.status(200).json(productDeliveries);
}

async function updateOptionName(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  const withWarnings = req.body.withWarnings === 'true';

  const option = await productOperations.getOptionById(id);
  if (!option) return res.status(400).json({ error: 'Option not found' });

  // do any products use this option
  if (option.name === name) return res.status(400).json({ error: 'No Change made.' });

  // check whether name already exists for the same optiontype
  const existingOption = await productOperations.getOptionByNameAndType(name, option.optionTypeFk);

  if (existingOption) {
    return res.status(400).json({
      error: 'Option with this name already exists for this Option Type.',
    });
  }

  const {
    productsWithPrintingOption, productsWithFinishingOption, optionGroupItemIds, finishingMatrixRowIds,
  } = await productOperations.getProductsWhichCurrentlyUseOptionId(id);

  if (productsWithPrintingOption.length > 0 || productsWithFinishingOption.length > 0) {
    if (withWarnings) {
      return res.status(500).json({ productsWithFinishingOption, productsWithPrintingOption });
    }
  }

  const newOption = await productOperations.createOption(name, option.optionTypeFk);

  if (optionGroupItemIds.length > 0) {
    await productOperations.updateOptionForOptionGroupItems(optionGroupItemIds, newOption.id);
  }

  if (finishingMatrixRowIds.length > 0) {
    await productOperations.updateOptionForFinishingMatrixRows(finishingMatrixRowIds, newOption.id);
  }

  // TO-DO
  // const templates = await productOperations.getTemplatesForSizeOptions([id]);

  // if (templates.length > 0) {
  //   const templateIds = templates.map((t) => t.id);
  //   await productOperations.updateOptionForTemplates(templateIds, newOption.id);
  // }

  await productOperations.deleteOption(id);

  return res.status(200).json({ id: newOption.id });
}

async function updateHomePageOption(req, res) {
  const { id } = req.params;

  const homePageOption = await homePageOperations.getHomePageOptionById(id);

  if (!homePageOption) return res.status(400).json({ error: `No Home page option found with id ${id}.` });

  const { productTypeId, description } = req.body;
  const { files } = req;

  if (productTypeId === undefined || productTypeId === null) return res.status(400).json({ error: "'productTypeId' must be set." });

  const productType = await productOperations.getProductTypeById(productTypeId);
  if (!productType) return res.status(400).json({ error: `No Product Type with id ${productTypeId}.` });

  const existingHomePageOptionWithProductType = await homePageOperations.getHomePageOptionByProductTypeId(productTypeId);
  if (existingHomePageOptionWithProductType && existingHomePageOptionWithProductType.id !== homePageOption.id) {
    return res.status(400).json({
      error: `Home Page Option at position ${existingHomePageOptionWithProductType.orderNo} is already using '${productType.productType}'`,
    });
  }

  if (description === undefined || description === null || utilityHelper.isEmptyString(description)) return res.status(400).json({ error: "'description' must be set." });

  if (homePageOption.imagePath === null && !files) {
    return res.status(400).json({ error: 'No image has been set.' });
  }

  if (Number(productTypeId) === homePageOption.productTypeFk && description === homePageOption.description && !files) {
    return res.status(400).json({ error: 'No changes made.' });
  }

  const updateData = {
    description,
    productTypeFk: productTypeId,
  };

  if (files && files.image) updateData.imagePath = await utilityHelper.uploadFile('homePageOptions', files.image);

  await homePageOperations.updateHomePageOption(id, updateData, true);
  req.session.message = 'Updated!';
  return res.status(200).json({});
}

async function removeHomePageOption(req, res) {
  const { id } = req.params;

  const homePageOption = await homePageOperations.getHomePageOptionById(id);

  if (!homePageOption) return res.status(400).json({ error: `No Home page option found with id ${id}.` });

  const updateData = {
    description: null,
    productTypeFk: null,
    imagePath: null,
  };
  await homePageOperations.updateHomePageOption(id, updateData, false);

  return res.json({});
}

async function getHomePageOptions(req, res) {
  const { message } = req.session;
  req.session.message = undefined;

  const homePageOptions = await homePageOperations.getHomePageOptionDetails();
  res.render('adminHomePageOptions', {
    user: req.user,
    message,
    homePageOptions,

    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getHomePageOption(req, res) {
  const { id } = req.params;
  const { message } = req.session;
  req.session.message = undefined;

  const homePageOption = await homePageOperations.getHomePageOptionById(id);
  const productTypes = await homePageOperations.getAllAvailableActiveProductTypes(homePageOption.productTypeFk);
  res.render('adminHomePageOption', {
    user: req.user,
    message,
    homePageOption,
    productTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function cloneProduct(req, res) {
  const { id } = req.params;
  const product = await productOperations.getProductById(id);
  if (!product) {
    // error
    return res.status(400).json({ error: 'Product no found.' });
  }

  const clonedProductDetails = { ...product.get() };
  clonedProductDetails.name = `${clonedProductDetails.name} - Clone`;
  clonedProductDetails.id = undefined;
  clonedProductDetails.deleteFl = true;
  clonedProductDetails.versionNo = 1;

  const clonedProduct = await productOperations.createProduct(clonedProductDetails, new Map(), []);
  const productQuantities = await productOperations.getQuantitiesForProduct(product.id);
  if (productQuantities.length > 0) {
    await productOperations.createQuantityGroupAndSetQuantities(
      clonedProduct.id,
      productQuantities.map((q) => q.id),
    );
    // extract
    const productPriceMatrixDetails = await productOperations.getPriceMatrixDetailsForProductId(product.id);
    if (productPriceMatrixDetails.length > 0) {
      let optionIds = [];
      productPriceMatrixDetails.forEach((productPriceMatrixDetail) => {
        productPriceMatrixDetail.forEach((obj) => {
          optionIds = [...optionIds, ...obj.options];
        });
      });

      const uniqueOptionIds = Array.from(new Set(optionIds.map((o) => o.id)));

      const rows = [];
      productPriceMatrixDetails.forEach((priceMatrixDetails) => {
        const row = { quantityGroup: [] };
        priceMatrixDetails.forEach((priceMatrix) => {
          if (!row.optionIdGroup) {
            row.optionIdGroup = priceMatrix.options.map((o) => o.id);
          }
          row.quantityGroup.push({ id: priceMatrix.quantityFk, price: priceMatrix.price === null ? '' : priceMatrix.price });
        });
        rows.push(row);
      });

      await productOperations.createPrintingAttributes(clonedProduct.id, uniqueOptionIds, rows, true);
    }

    const finishingMatricesDetails = await productOperations.getFinishingMatricesDetailsForProductId(product.id);
    if (finishingMatricesDetails.length > 0) {
      const finishingMatrices = [];

      finishingMatricesDetails.forEach((finishingMatrixDetails) => {
        const rowsMap = new Map();
        const rows = [];
        finishingMatrixDetails.rows.forEach((matrixRow) => {
          const { orderNo } = matrixRow;
          if (!rowsMap.has(orderNo)) {
            rowsMap.set(orderNo, { optionId: [matrixRow.optionId], quantityGroup: [] });
          }

          rowsMap
            .get(orderNo)
            .quantityGroup.push({ id: matrixRow.quantityFk, price: matrixRow.price === null ? '' : matrixRow.price });
        });

        rowsMap.forEach((value) => {
          rows.push(value);
        });

        finishingMatrices.push(rows);
      });

      await productOperations.createFinishingMatrices(clonedProduct.id, finishingMatrices);
    }
  }

  const deliveryOptionsForProduct = await deliveryOperations.getAllDeliveryOptionsForProduct(product.id);

  if (deliveryOptionsForProduct.length > 0) {
    const deliveryOptions = deliveryOptionsForProduct.map((d) => ({ price: d.price, deliveryId: d.deliveryTypeFk }));
    await deliveryOperations.createDeliveryOptionsForProduct(clonedProduct.id, deliveryOptions);
  }

  req.session.message = 'Clone Successful';

  return res.status(200).json({ id: clonedProduct.id });
}

module.exports = {
  activate,
  addFaq,
  addOption,
  addOptionType,
  addProductType,
  addTemplate,
  cloneProduct,
  continuePage1,
  continuePage3,
  continuePage4,
  createAdmin,
  createProduct,
  createRefund,
  createSale,
  deactivate,
  deactivateAccount,
  deleteNotification,
  deleteNotifications,
  deleteSale,
  editFaq,
  editProduct,
  editProductType,
  editTemplate,
  getAccountDeletePage,
  getAccountEmailsPage,
  getAccountOrderPage,
  getAccountOrdersPage,
  getAccountPage,
  getAccountsPage,
  getActivatePage,
  getAddFaqPage,
  getAddProductTypePage,
  getAddSalePage,
  getAddTemplatePage,
  getAdminDashboardPage,
  getBannerSectionPage,
  getCreateAdminPage,
  getDeactivatePage,
  getDeliveryType,
  getDeliveryTypes,
  getFaqPage,
  getFaqsPage,
  getFinishingMatrices,
  getHomePageOption,
  getHomePageOptions,
  getMainBannerSectionPage,
  getNavigationBarPage,
  getNotifications,
  getOptionsForOptionType,
  getOptionPage,
  getOptionTypesAndOptionForProduct,
  getOptionTypePage,
  getOptionTypesPage,
  getOrdersPage,
  getOustandingAmountOfOrder,
  getPriceMatrixRows,
  getProductDeliveries,
  getProductWithNoActiveSalesForSale,
  getProductWithNoActiveSales,
  getProductPage,
  getProductsPage,
  getProductPage1,
  getProductPage2,
  getProductPage3,
  getProductPage4,
  getProductPage5,
  // getProductPage6,
  getProductTypePage,
  getProductTypesPage,
  getRefundTypes,
  getQuantities,
  getSalePage,
  getSalesPage,
  getSaleProducts,
  getSetup2faPage,
  getTemplatePage,
  getTemplatesPage,
  reactivateAccount,
  removeHomePageOption,
  saveDeliveryOptions,
  saveFinishingAttributes,
  savePage1,
  savePrintingAttributes,
  saveQuantities,
  setHomePageBanner,
  setHomePageMainBanner,
  setNavigationBarHeaders,
  setup2fa2Registration,
  updateHomePageOption,
  updateOptionName,
  updateSale,
  validate,
  verifyQuantities,
};
