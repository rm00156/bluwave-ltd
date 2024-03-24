const logger = require('pino')();
const passport = require('passport');
const companyInfo = require('../utilty/company/companyInfo');
const basketOperations = require('../utilty/basket/basketOperations');
const accountOperations = require('../utilty/account/accountOperations');
const orderOperations = require('../utilty/order/orderOperations');
const productOperations = require('../utilty/products/productOperations');

const isDevelopment = process.env.NODE_ENV === undefined;

async function renderCheckoutLogin(req, res, error) {
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  res.render('checkoutLogin', {
    user: req.user,
    error,
    companyDetails: companyInfo.getCompanyDetails(),
    navigationBarHeaders,
    basketItems,
    allProductTypes,
    displayCookieMessage,
  });
}

async function renderLogin(req, res) {
  const { displayCookieMessage } = req.body;
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  res.render(req.body.checkout === undefined ? 'login' : 'checkoutLogin', {
    error: 'You have entered an invalid username or password',
    allProductTypes,
    displayCookieMessage,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

function renderAdminLogin(req, res) {
  const { twoFa } = req.session;
  let error;
  if (twoFa === true) error = 'The code you entered was incorrect, please try again.';
  else error = 'You have entered an invalid username or password.';

  res.redirect(`/admin/login?error=${error}`);
}

async function getAdminLoginPage(req, res) {
  req.session.attempt = 0;
  const { error } = req.query;
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  const username = isDevelopment ? process.env.LOGIN_USERNAME : null;
  const password = isDevelopment ? process.env.LOGIN_PASSWORD : null;

  res.render('adminLogin', {
    user: req.user,
    error,
    username,
    password,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

function adminLogin(req, res, next) {
  const { twoFa } = req.session;
  passport.authenticate(twoFa ? 'login1' : 'login2', (err, user) => {
    if (err || !user) {
      if (err) logger.error(err);

      return renderAdminLogin(req, res);
    }

    return req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      return res.redirect('/admin-dashboard');
    });
  })(req, res, next);
}

async function adminLoginStepTwo(req, res) {
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('adminLoginStepTwo', {
    user: req.user,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

function logout(req, res) {
  req.logout(() => {
    req.session.destroy();
    res.clearCookie('bluwave_ecommerce_user_data');
    res.redirect('/');
  });
}

async function getLoginPage(req, res) {
  const { displayCookieMessage } = req.body;
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('login', {
    user: req.user,
    allProductTypes,
    displayCookieMessage,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

function login(req, res, next) {
  passport.authenticate('local', (err, account) => {
    if (err) return next(err);

    if (!account) return renderLogin(req, res);

    return req.logIn(account, async (loginErr) => {
      if (loginErr) return next(loginErr);

      await accountOperations.createCookie(account.id, 60000 * 60 * 24 * 7, res);
      // we need to clear any cookie and create new cookie
      return res.redirect(`/account/${account.id}/orders`);
    });
  })(req, res, next);
}

async function checkoutLogin(req, res, next) {
  const guestAccount = req.user;
  passport.authenticate('local', (err, account) => {
    if (err) return next(err);

    if (!account) {
      return renderCheckoutLogin(
        req,
        res,
        'You have entered an invalid username or password',
      );
    }

    return req.logIn(account, async (loginErr) => {
      if (loginErr) return next(loginErr);

      const basketItems = await basketOperations.getActiveBasketItemsForAccount(
        guestAccount.id,
      );
      const basketItemIds = basketItems.basketItems.map((b) => b.id);

      await basketOperations.updateBasketItemsToAccount(
        account.id,
        basketItemIds,
      );

      // delete cookie
      await accountOperations.deleteActiveCookieForAccount(guestAccount.id);
      // check if there have been any orders for this account
      const purchaseBaskets = await orderOperations.getSuccessfulOrdersForAccountId(guestAccount.id);
      if (purchaseBaskets.length === 0) {
        await guestAccount.destroy();
      }

      res.clearCookie('bluwave_ecommerce_user_data');

      const maxAge = 60000 * 60 * 24 * 7; // 7days
      await accountOperations.createCookie(account.id, maxAge, res);
      // var userData = {id:account.id};
      // 7 days
      // res.cookie('bluwave_ecommerce_user_data', userData , {httpOnly: true, maxAge: maxAge});
      return res.redirect('/checkout');
    });
  })(req, res, next);
}

module.exports = {
  checkoutLogin,
  login,
  adminLogin,
  getAdminLoginPage,
  getLoginPage,
  logout,
  adminLoginStepTwo,
};
