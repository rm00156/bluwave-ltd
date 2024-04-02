const passport = require('passport');
const accountOperations = require('../utility/account/accountOperations');

async function loginUsingCookie(req, next, res) {
  const cookieDetails = req.cookies.bluwave_ecommerce_user_data;
  const account = await accountOperations.findAccountById(cookieDetails.id);
  req.body.email = account.email;
  req.body.password = process.env.LOGIN_PASSWORD;

  passport.authenticate('local2', (err, user) => {
    if (err) return next(err);

    return req.logIn(user, async (loginErr) => {
      if (loginErr) return next(loginErr);

      return next();
    });
  })(req, res, next);
}

async function getUser(req, res, next) {
  const account = req.user;

  if (account) {
    // logged in
    if (account.guestFl === true) {
      const cookie = await accountOperations.getActiveCookie(account.id);

      if (cookie === null || cookie.acceptedFl === false) {
        req.body.displayCookieMessage = true;
      } else {
        req.body.displayCookieMessage = false;
      }
    }

    next();
  } else {
    // not logged in
    // // first time coming to site or first time coing to site in awhile
    const cookie = req.cookies.bluwave_ecommerce_user_data;
    if (cookie) {
      await loginUsingCookie(req, next, res);
    } else {
      // no cookie

      const email = await accountOperations.createGuestAccount(res);

      req.body.email = email;
      req.body.password = process.env.LOGIN_PASSWORD;

      passport.authenticate('local', (err, user) => {
        if (err) return next(err);

        return req.logIn(user, async (loginErr) => {
          if (loginErr) return next(loginErr);

          req.body.displayCookieMessage = true;
          return next();
        });
      })(req, res, next);
    }
  }
}

async function isCheckoutAsGuest(req, res, next) {
  const account = req.user;

  if (account.guestFl === true) {
    // check whether session has checkoutAsGuestFl = true
    if (req.session.checkoutAsGuestFl === true) {
      return next();
    }

    return res.redirect('/checkout-login');
  }

  return next();
}

async function isGuest(req, res, next) {
  const account = req.user;

  if (account.guestFl === true) {
    if (req.session.checkoutAsGuestFl === true) {
      return res.redirect('/checkout');
    }
    return next();
  }

  return res.redirect('/checkout');
}

module.exports = {
  getUser,
  isCheckoutAsGuest,
  isGuest,
};
