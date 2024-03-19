const accountOperations = require('../utilty/account/accountOperations');
const utilityHelper = require('../utilty/general/utilityHelper');

const notProduction = process.env.NODE_ENV !== 'production';

async function isAdmin(req, res, next) {
  const account = req.user;

  if (!account) {
    return res.redirect('/login');
  }

  if (account.accountTypeFk !== 1) {
    // redirect to page to set up 2fa
    return res.redirect('/login');
  }

  return next();
}

async function isSecuredAdmin(req, res, next) {
  const account = req.user;

  if (account === null) {
    return res.redirect('/login');
  }

  const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(
    account.id,
  );

  if (
    account.accountTypeFk !== 1
    || (twoFactorAuth !== null && twoFactorAuth.authenticatedFl === true)
  ) {
    // redirect to page to set up 2fa
    return res.redirect('/login');
  }

  return next();
}

async function enterPassword(req, res, next) {
  const { password } = req.query;
  if (!utilityHelper.validPassword(req.user, password)) {
    res.redirect('/setup-2fa');
  } else {
    req.session.password = password;
    next();
  }
}

async function adminRequire2faSetup(req, res, next) {
  const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(
    req.user.id,
  );
  if (
    !notProduction
    && (twoFactorAuth === null || !twoFactorAuth.authenticatedFl)
  ) {
    return res.redirect('/setup-2fa');
  }

  return next();
}

async function isLoginRequire2faCode(req, res, next) {
  const { email } = req.body;
  const { password } = req.body;

  const account = await accountOperations.findAccountByEmail(email);

  if (account === null) {
    // error
    return res.redirect('/admin/login?error=UserNotFound');
  }

  if (!utilityHelper.validPassword(account, password)) {
    return res.redirect('/admin/login?error=UserNotFound');
  }

  req.session.password = password;
  const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(
    account.id,
  );
  if (!notProduction && twoFactorAuth !== null && twoFactorAuth.authenticatedFl === true) {
    req.session.email = account.email;
    req.session.twoFa = true;
    return res.redirect('/admin/login/step-two');
  }

  req.session.twoFa = false;
  return next();
}

function twoFa2(req, res, next) {
  if (req.session.attempt === undefined) {
    return res.redirect('/admin/login');
  }

  req.session.attempt += 1;

  if (req.session.attempt > 1) {
    return res.redirect('/admin/login');
  }
  return next();
}

function twoFa(req, res, next) {
  if (req.session.twoFa === true) {
    req.body.email = req.session.email;
    req.body.password = req.session.password;
    next();
  } else {
    res.redirect('/admin/login');
  }
}

async function setup2fa(req, res, next) {
  const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(
    req.user.id,
  );

  if (twoFactorAuth !== null && twoFactorAuth.authenticatedFl === true) {
    req.session.message = undefined;
    res.redirect('/admin-dashboard');
  } else {
    req.body.email = req.user.email;
    req.body.password = req.session.password;
    next();
  }
}

module.exports = {
  adminRequire2faSetup,
  enterPassword,
  isAdmin,
  isLoginRequire2faCode,
  isSecuredAdmin,
  setup2fa,
  twoFa,
  twoFa2,
};
