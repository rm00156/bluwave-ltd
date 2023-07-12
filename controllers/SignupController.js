const companyInfo = require('../utilty/company/companyInfo');
const{ validateCustomerUser } = require('../validators/signup');
const { isEmpty } = require('lodash');
const accountOperations = require('../utilty/account/accountOperations');
const queueOperations = require('../utilty/queue/queueOperations');
const passport = require('passport');

exports.getSignUpPage = async function(req,res)
{
    var displayCookieMessage = req.body.displayCookieMessage;
    res.render('signup', {  user:req.user,
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
    res.render('signup',{errors: errors, 
            user: req.user,
            companyDetails: companyInfo.getCompanyDetails(),
            displayCookieMessage: displayCookieMessage});
}

async function render_checkoutLogin(errors, req, res) {
    const flyerProducts = await productOperations.getActiveProductsForProductTypeName('Flyers & Leaflets');
    const businessCards = await productOperations.getActiveProductsForProductTypeName('Business Cards');
    const brochures = await productOperations.getActiveProductsForProductTypeName('Brochures');
    const books = await productOperations.getActiveProductsForProductTypeName('Books');
    const rollerBanners = await productOperations.getActiveProductsForProductTypeName('Roller Banners');
    const posters = await productOperations.getActiveProductsForProductTypeName('Posters');
    const cards = await productOperations.getActiveProductsForProductTypeName('Cards');
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    res.render('checkoutLogin', 
                {   user: req.user, errors: errors, 
                    companyDetails: companyInfo.getCompanyDetails(),
                    flyerProducts: flyerProducts,
                    businessCards: businessCards,
                    brochures: brochures,
                    books: books,
                    rollerBanners: rollerBanners,
                    posters: posters,
                    cards: cards,
                    basketItems: basketItems,
                    displayCookieMessage: displayCookieMessage});
}