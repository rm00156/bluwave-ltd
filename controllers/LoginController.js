const companyInfo = require('../utilty/company/companyInfo');
const passport = require('passport');
const basketOperations = require('../utilty/basket/basketOperations');
const accountOperations = require('../utilty/account/accountOperations');
const orderOperations = require('../utilty/order/orderOperations');
const productOperations = require('../utilty/products/productOperations');

async function getAdminLoginPage(req,res)
{
    req.session.attempt = 0;
    var error = req.query.error;
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('adminLogin', {user:req.user,
                              error:error,
                              allProductTypes: allProductTypes,
                              companyDetails: companyInfo.getCompanyDetails()});
}

function adminLogin(req,res,next)
{
    var twoFa = req.session.twoFa;
    passport.authenticate( twoFa ? 'login1': 'login2', (err,user,info)=> {
        if(err || !user)
        {
            if(err)
                console.log(err);
            
            return render_AdminLogin(req,res);
        }
                
        req.logIn(user, (err)=>{

            if(err)
                return next(err);
            
            return res.redirect('/admin_dashboard');

        })
                
    })(req,res,next);
       
}

async function adminLoginStepTwo(req,res)
{
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('adminLoginStepTwo', {
            user:req.user,
            allProductTypes: allProductTypes,
         companyDetails: companyInfo.getCompanyDetails()});
}

function logout(req,res)
{
    req.logout();
    req.session.destroy();
    res.clearCookie('bluwave_ecommerce_user_data')
    res.redirect('/');
}

async function getLoginPage(req,res)
{
    var displayCookieMessage = req.body.displayCookieMessage;
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('login',{user: req.user, 
                        allProductTypes: allProductTypes,
                        displayCookieMessage:displayCookieMessage, companyDetails: companyInfo.getCompanyDetails()});
}

function login(req,res,next)
{
    passport.authenticate('local', (err,account,info)=> {
        if(err)
            return next(err);
        
        if(!account)
            return render_login(req,res);

        req.logIn(account,async (err)=>{

            if(err)
                return next(err);
        
            return res.redirect('/account/' + account.id + '/orders');

        })
                
    })(req,res,next);
       
}

async function checkoutLogin(req, res, next) {
    const guestAccount = req.user;
    passport.authenticate('local', (err,account,info)=> {
        if(err)
            return next(err);
        
        if(!account)
            return render_checkoutLogin(req,res, 'You have entered an invalid username or password');

        req.logIn(account,async (err)=>{

            if(err)
                return next(err);

            
            const basketItems = await basketOperations.getActiveBasketItemsForAccount(guestAccount.id);
            const basketItemIds = basketItems.basketItems.map(b => b.id);

            await basketOperations.updateBasketItemsToAccount(account.id, basketItemIds);
            
            // delete cookie
            await accountOperations.deleteActiveCookieForAccount(guestAccount.id);
            // check if there have been any orders for this account
            const purchaseBaskets = await orderOperations.getSuccessfulOrdersForAccountId(guestAccount.id);
            if(purchaseBaskets.length == 0) {
                await guestAccount.destroy();
            }
            
            res.clearCookie('bluwave_ecommerce_user_data');

            const maxAge = 60000*60*24*7; // 7days
            await accountOperations.createCookie(account.id, maxAge, res);
            // var userData = {id:account.id};
            // 7 days
            // res.cookie('bluwave_ecommerce_user_data', userData , {httpOnly: true, maxAge: maxAge});
            return res.redirect('/checkout');
        })
                
    })(req,res,next);
}

const render_login = async function(req,res)
{
    var displayCookieMessage = req.body.displayCookieMessage;
    
    res.render((req.body.checkout == undefined ) ? 'login' : 'checkoutLogin', 
                { error: 'You have entered an invalid username or password', 
                    displayCookieMessage:displayCookieMessage, companyDetails: companyInfo.getCompanyDetails()
    });
}


const render_AdminLogin = function(req,res)
{
    var twoFa = req.session.twoFa;
    var error;
    if(twoFa == true)
        error = "The code you entered was incorrect, please try again."
    else
        error = "You have entered an invalid username or password.";
    
    res.redirect('/admin/login?error=' + error);
}

async function render_checkoutLogin(req, res, error) {
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    res.render('checkoutLogin', 
                {   user: req.user, error: error, 
                    companyDetails: companyInfo.getCompanyDetails(),
                    navigationBarHeaders: navigationBarHeaders,
                    basketItems: basketItems,
                    allProductTypes: allProductTypes,
                    displayCookieMessage: displayCookieMessage});
}

module.exports = {
    checkoutLogin,
    login,
    adminLogin,
    getAdminLoginPage,
    getLoginPage,
    logout,
    adminLoginStepTwo
}