const companyInfo = require('../utilty/company/companyInfo');
const productOperations = require('../utilty/products/productOperations');
const accountOperations = require('../utilty/account/accountOperations');
const basketOperations = require('../utilty/basket/basketOperations');
const queueOperations = require('../utilty/queue/queueOperations');

exports.getHomePage = async function(req, res) {

    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;

    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();
    const homePageBannerSection = await productOperations.getHomePageBannerSection();
    if(homePageBannerSection != null) {
        homePageBannerSection['productType'] = await productOperations.getProductTypeById(homePageBannerSection.productTypeFk);
    }
    const homePageOptions = await productOperations.getHomePageOptions();

    const homePageOptions1To4 = [];
    const homePageOptions5To8 = [];
    for(var i = 1; i <= 4; i++) { 
        const productTypeId = homePageOptions[`productTypeFk${i}`];
        if(productTypeId != null) {
            homePageOptions1To4.push({
                productType: await productOperations.getProductTypeById(productTypeId), 
                imagePath: homePageOptions[`imagePath${i}`],
                description: homePageOptions[`description${i}`]})
        }
    }

    for(var i = 5; i <= 8; i++) { 
        const productTypeId = homePageOptions[`productTypeFk${i}`];
        if(productTypeId != null) {
            homePageOptions5To8.push({
                productType: await productOperations.getProductTypeById(productTypeId), 
                imagePath: homePageOptions[`imagePath${i}`],
                description: homePageOptions[`description${i}`]})
        }
    }
    res.render('home', {user: req.user,
                        basketItems: basketItems,
                        displayCookieMessage: displayCookieMessage,
                        navigationBarHeaders: navigationBarHeaders,
                        allProductTypes: allProductTypes,
                        homePageOptions1To4: homePageOptions1To4,
                        homePageOptions5To8: homePageOptions5To8,
                        homePageBannerSection: homePageBannerSection,
                        companyDetails: companyInfo.getCompanyDetails()});
}

exports.getTermsPage = async function(req, res) {
    
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('terms', {
        user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        displayCookieMessage: displayCookieMessage,
        allProductTypes: allProductTypes,
        companyDetails: companyInfo.getCompanyDetails()})
}

exports.getPrivacyPage = async function(req, res) {
    
    const basketItems = await basketOperations.getActiveBasketItemsForAccount(req.user.id);
    var displayCookieMessage = req.body.displayCookieMessage;
    const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('privacy', {
        user: req.user,
        navigationBarHeaders: navigationBarHeaders,
        basketItems: basketItems,
        displayCookieMessage: displayCookieMessage,
        allProductTypes: allProductTypes,
        companyDetails: companyInfo.getCompanyDetails()})
}

exports.acceptCookie = async function(req, res)
{
    var id = req.user.id;
    const activeCookie = await accountOperations.getActiveCookie(id);

    if(activeCookie != null) {
        await accountOperations.acceptCookie(activeCookie.id);
        return res.status(200).json({});
    }

    return res.status(400).json({});
    
}

exports.getErrorPage = function(req, res) {
    res.render('404', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.getForgotPasswordPage = async function(req, res) {
    const allProductTypes = await productOperations.getAllActiveProductTypes();

    res.render('forgotPassword', {
        user: req.user,
        allProductTypes: allProductTypes,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.searchProductOrProductTypes = async function(req, res) {

    const search = req.query.search;

    const products = await productOperations.searchProductsByName(search);
    const productTypes = await productOperations.searchProductTypesByName(search);

    const searchResult = [...products, ... productTypes];

    res.status(200).json(searchResult);
}

exports.requestForgottenPasswordEmail = async function(req, res) {

    const email = req.body.email;

    const account = await accountOperations.findAccountByEmail(email);

    if(account != null) {

        await queueOperations.addForgottenPasswordEmailJob(account.id);
        return res.status(200).json({});
    } else {
        res.status(400).json({error: 'No Account found with this email'})
    }    
}

exports.resetPasswordPage = async function(req, res) {

    const accountId = req.params.accountId;
    const token = req.params.token;

    const forgottenPassword = await accountOperations.getForgottenPassword(accountId, token);

    if(forgottenPassword == null) {
        // link has expired
        // or used
        // 
        return res.render('resetPassword', {
            user: req.user, error: {},
            companyDetails: companyInfo.getCompanyDetails()})
    } else {
        return res.render('resetPassword', {
            user: req.user, forgottenPasswordId: forgottenPassword.id,
            companyDetails: companyInfo.getCompanyDetails()})
    }
}

exports.resetPassword = async function(req, res) {

    const password = req.body.password;
    const rePassword = req.body.rePassword;

    if(password != rePassword) {
        return res.status(400).json({error: "Passwords don't match"});
    }

    const forgottenPasswordId = req.body.forgottenPasswordId;
    const forgettenPassword = await accountOperations.getForgottenPasswordById(forgottenPasswordId);

    if(forgettenPassword == null) {
        const invalidForgettenPassword = await accountOperations.findForgottenPasswordById(forgottenPasswordId);
        return res.status(400).json({error: "Link Expired", token: invalidForgettenPassword.token, accountId: invalidForgettenPassword.accountFk});
    }

    await accountOperations.updatePassword(forgettenPassword.accountFk, password);
    await accountOperations.updateForgottenPasswordAsUsed(forgottenPasswordId);
    res.status(200).json({});
}

exports.passwordResetPage = async function(req, res) {
    res.render('passwordReset', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()});
}

exports.passwordEmailSentPage = async function(req, res) {
    res.render('forgottenPasswordEmailSentPage', {
        user: req.user,
        companyDetails: companyInfo.getCompanyDetails()});
}
