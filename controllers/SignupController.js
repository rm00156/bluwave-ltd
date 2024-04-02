const { isEmpty } = require('lodash');
const logger = require('pino')();
const passport = require('passport');
const companyInfo = require('../utility/company/companyInfo');
const { validateCreateUserFields } = require('../validators/signup');
const accountOperations = require('../utility/account/accountOperations');
const basketOperations = require('../utility/basket/basketOperations');
const productOperations = require('../utility/products/productOperations');

const notProduction = process.env.NODE_ENV !== 'production';

const queueOperations = !notProduction
  ? require('../utility/queue/queueOperations')
  : null;

async function rerenderSignup(errors, req, res) {
  const { displayCookieMessage } = req.body;
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('signup', {
    errors,
    user: req.user,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
    displayCookieMessage,
  });
}

async function renderCheckoutLogin(errors, req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('checkoutLogin', {
    user: req.user,
    errors,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    displayCookieMessage,
  });
}

async function getSignUpPage(req, res) {
  const { displayCookieMessage } = req.body;
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('signup', {
    user: req.user,
    allProductTypes,
    displayCookieMessage,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function signup(req, res, next) {
  const { checkout } = req.params;

  const errors = validateCreateUserFields(req);
  if (!isEmpty(errors)) {
    // reRender the sign up page with the errors
    logger.error(errors);
    return checkout !== 'checkout'
      ? rerenderSignup(errors, req, res)
      : renderCheckoutLogin(errors, req, res);
  }
  await accountOperations.updateAccount(
    req.user.id,
    req.body.email,
    req.body.password,
    req.body.name,
    req.body.phoneNumber,
    2,
    false,
    false,
  );
  // req.cookies =[];
  // res.clearCookie('bluwave_ecommerce_user_data');

  // await workerQueue.add({process:'registrationEmail',email:req.user.email});

  // await workerQueue.add({process:'parentRegistrationEmail',email:req.body.email});
  // await workerQueue.add({process:'parentRegistrationEmailToBluwave'
  // ,email:req.body.email,telephoneNo:telephoneNo,name:name});

  // authenticate with passport
  await queueOperations.addSendSigupEmail(req.user.id);
  return passport.authenticate('local', {
    successRedirect: checkout !== 'checkout' ? '/' : '/checkout',
    failureRedirect: checkout !== 'checkout' ? '/signup' : '/checkout-login',
    failureFlash: true,
  })(req, res, next);

  // });
}

module.exports = {
  getSignUpPage,
  signup,
};
