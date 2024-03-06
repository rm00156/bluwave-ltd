const GoogleAuthenticator = require('passport-2fa-totp').GoogeAuthenticator;
const TwoFAStrategy = require('passport-2fa-totp').Strategy;
const utilityHelper = require('./utilty/general/utilityHelper');
const accountOperations = require('./utilty/account/accountOperations');

module.exports = function passports(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    const account = await accountOperations.findAccountById(id);

    if (account == null) { done(new Error('Wrong account id')); }

    done(null, account);
  });

  passport.use(new TwoFAStrategy((async (email, password, done) => {
    // 1st step verification: username and password

    const account = await accountOperations.findAccountByEmail(email);

    if (account == null) {
      return done(null, false);
    }
    if (account.password === null || account.password === undefined) {
      return done(null, false);
    }
    if (!utilityHelper.validPassword(account, password)) {
      return done(null, false);
    }

    return done(null, account);
  }), (async (account, done) => {
    // 2nd step verification: TOTP code from Google Authenticator

    const twoFactorAuth = await accountOperations.getTwoFactorAuthForAccountId(account.id);
    if (twoFactorAuth == null || !twoFactorAuth.authenticatedFl) {
      done(new Error('Google Authenticator is not setup yet.'));
    } else {
      // Google Authenticator uses 30 seconds key period
      // https://github.com/google/google-authenticator/wiki/Key-Uri-Format

      const secret = GoogleAuthenticator.decodeSecret(twoFactorAuth.secret);
      done(null, secret, 30);
    }
  })));
};
