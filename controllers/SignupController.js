const companyInfo = require('../utilty/company/companyInfo');
const{ validateCustomerUser } = require('../validators/signup');
const { isEmpty } = require('lodash');
const accountOperations = require('../utilty/account/accountOperations');
const productOperations = require('../utilty/products/productOperations');
const queueOperations = require('../utilty/queue/queueOperations');
const passport = require('passport');

exports.getSignUpPage = async function(req,res)
{
    var displayCookieMessage = req.body.displayCookieMessage;
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('signup', {  user:req.user,
                            allProductTypes: allProductTypes,
                            displayCookieMessage: displayCookieMessage,
                            companyDetails: companyInfo.getCompanyDetails()
    });
}

exports.signup = async function(req, res, next) {
    var errors = {};
    const checkout = req.params.checkout;

    return validateCustomerUser(errors, req).then(async errors=>{
 
    if(!isEmpty(errors))
    {
        // reRender the sign up page with the errors
        console.log(errors);
        checkout != 'checkout' ? rerender_signup(errors,req,res) : render_checkoutLogin (errors,req,res);
    }
    else
    {
        await accountOperations.updateAccount(req.user.id, req.body.email, req.body.password, req.body.name, req.body.phoneNumber, 2, false, false);
        // req.cookies =[];
        // res.clearCookie('bluwave_ecommerce_user_data');
    

        // await workerQueue.add({process:'registrationEmail',email:req.user.email});

            // await workerQueue.add({process:'parentRegistrationEmail',email:req.body.email});
            // await workerQueue.add({process:'parentRegistrationEmailToBluwave',email:req.body.email,telephoneNo:telephoneNo,name:name});
            
            // authenticate with passport
        await queueOperations.addSendSigupEmail(req.user.id);
        passport.authenticate('local', {
            successRedirect: checkout != 'checkout' ? '/': '/checkout',
            failureRedirect: checkout != 'checkout' ? '/signup': '/checkout_login',
            failureFlash: true
        })(req, res, next);                   
        }
    });
}


async function rerender_signup(errors,req, res)
{
    var displayCookieMessage = req.body.displayCookieMessage;
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('signup',{errors: errors, 
            user: req.user,
            allProductTypes: allProductTypes,
            companyDetails: companyInfo.getCompanyDetails(),
            displayCookieMessage: displayCookieMessage});
}

async function render_checkoutLogin(errors, req, res) {
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('checkoutLogin', 
                {   user: req.user, errors: errors, 
                    companyDetails: companyInfo.getCompanyDetails(),
                    navigationBarHeaders: navigationBarHeaders,
                    basketItems: basketItems,
                    allProductTypes: allProductTypes,
                    displayCookieMessage: displayCookieMessage});
}