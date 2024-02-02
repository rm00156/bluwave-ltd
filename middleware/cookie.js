const passport = require('passport');
const accountOperations = require('../utilty/account/accountOperations');
exports.getUser = async function (req, res, next) {
    var account = req.user;

    if (account) {
        // logged in 
        if (account.guestFl == true) {
            const cookie = await accountOperations.getActiveCookie(account.id);

            if (cookie == null || cookie.acceptedFl == false) {
                req.body['displayCookieMessage'] = true;
            } else {
                req.body['displayCookieMessage'] = false;
            }
        }

        next();
    }
    else {
        // not logged in
        // // first time coming to site or first time coing to site in awhile
        var cookie = req.cookies['bluwave_ecommerce_user_data'];
        if (cookie) {
            await loginUsingCookie(req, next, res);
        }
        else {
            // no cookie

            const email = await accountOperations.createGuestAccount(res);

            req.body['email'] = email;
            req.body['password'] = 'welcome';

            passport.authenticate('local', (err, user, info) => {
                if (err)
                    return next(err);

                req.logIn(user, async (err) => {

                    if (err)
                        return next(err);

                    req.body['displayCookieMessage'] = true;
                    next();
                });
            })(req, res, next);
        }
    }
}

exports.isCheckoutAsGuest = async function (req, res, next) {

    const account = req.user;

    if (account.guestFl == true) {

        // check whether session has checkoutAsGuestFl = true
        if (req.session.checkoutAsGuestFl == true) {
            return next();
        } else {

            return res.redirect('/checkout_login');
        }
    }

    return next();
}

exports.isGuest = async function (req, res, next) {

    const account = req.user;

    if (account.guestFl == true) {

        if (req.session.checkoutAsGuestFl == true) {
            return res.redirect('/checkout');
        } else {
            return next();
        }
    }

    return res.redirect('/checkout');
}

async function loginUsingCookie(req, next, res) {
    const cookieDetails = req.cookies['bluwave_ecommerce_user_data'];
    const account = await accountOperations.findAccountById(cookieDetails.id);
    req.body['email'] = account.email;
    req.body['password'] = 'welcome';

    passport.authenticate('local2', (err, user, info) => {
        if (err)
            return next(err);

        req.logIn(user, async (err) => {

            if (err)
                return next(err);

            next();
        });
    })(req, res, next);
}
