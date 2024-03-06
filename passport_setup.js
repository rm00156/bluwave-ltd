const LocalStrategy = require('passport-local').Strategy;
const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const TwoFAStrategy = require('passport-2fa-totp').Strategy;
const utilityHelper = require('./utilty/general/utilityHelper');
const accountOperations = require('./utilty/account/accountOperations');

module.exports = function passports(passport) {
  passport.serializeUser((account, done) => {
    done(null, account.id);
  });

  passport.deserializeUser(async (id, done) => {
    const account = await accountOperations.findAccountById(id);
    if (account === null) done(new Error('Wrong account id'));

    done(null, account);
  });

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  }, async (req, email, password, done) => {
    const account = await accountOperations.findAccountByEmail(email);

    if (account === null) {
      req.flash('message', 'Incorrect Credentials');
      return done(null, false);
    }
    if (account.accountTypeFk === 1) {
      req.flash('message', 'Admin');
      return done(null, false);
    }
    if (account.password === null || account.password === undefined) {
      req.flash('message', 'You must reset your password');
      return done(null, false);
    }
    if (!utilityHelper.validPassword(account, password)) {
      req.flash('message', 'Incorrect credentials');
      return done(null, false);
    }

    return done(null, account);
  }));

  passport.use('local2', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  }, async (req, email, password, done) => {
    const account = await accountOperations.findAccountByEmail(email);

    if (account === null) {
      req.flash('message', 'Incorrect Credentials');
      return done(null, false);
    }

    return done(null, account);
  }));

  passport.use('login2', new TwoFAStrategy({
    usernameField: 'email',
    passwordField: 'password',
    codeField: 'code',
    passReqToCallback: true,
    skipTotpVerification: true,

  }, (async (req, email, password, done) => {
    const account = await accountOperations.findAccountByEmail(email);

    if (account === null) {
      req.flash('message', 'Incorrect Credentials');
      return done(null, false);
    }
    if (account.accountTypeFk !== 1) {
      req.flash('message', 'Not Admin');
      return done(null, false);
    }
    if (account.password === null || account.password === undefined) {
      req.flash('message', 'You must reset your password');
      return done(null, false);
    }
    if (!utilityHelper.validPassword(account, password)) {
      req.flash('message', 'Incorrect credentials');
      return done(null, false);
    }

    return done(null, account);
  }), (() => {})));

  passport.use('register', new TwoFAStrategy({
    usernameField: 'email',
    passwordField: 'password',
    codeField: 'code',
    passReqToCallback: true,
    skipTotpVerification: false,
  }, (async (req, email, password, done) => {
    done(null, req.user);
  }), (async (req, user, done) => {
    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(user.id);
    const secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
    done(null, secret, 30);
  })));

  passport.use('login1', new TwoFAStrategy({
    usernameField: 'email',
    passwordField: 'password',
    codeField: 'code',
    passReqToCallback: true,
    skipTotpVerification: false,
  }, (async (req, email, password, done) => {
    const account = await accountOperations.findAccountByEmail(email);

    if (account === null) {
      req.flash('message', 'Incorrect Credentials');
      return done(null, false);
    }
    if (account.accountTypeFk !== 1) {
      req.flash('message', 'Not Admin');
      return done(null, false);
    }
    if (account.password === null || account.password === undefined) {
      req.flash('message', 'You must reset your password');
      return done(null, false);
    }
    if (!utilityHelper.validPassword(account, password)) {
      req.flash('message', 'Incorrect credentials');
      return done(null, false);
    }

    return done(null, account);
  }), (async (req, account, done) => {
    if (account.accountTypeFk !== 1) return done(new Error('Not an admin Account'));

    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
    if (twoFactorAuth === null || !twoFactorAuth.authenticatedFl) {
      return done(null, account);
    }

    const secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
    return done(null, secret, 30);
  })));
};
