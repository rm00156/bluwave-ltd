const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/AdminDashboardController');
const customerAccountController = require('../controllers/CustomerAccountController');
const homeController = require('../controllers/HomeController');
const signupController = require('../controllers/SignupController');
const loginController = require('../controllers/LoginController');
const shopController = require('../controllers/ShopController');
const {isCustomer, isNotGuest} = require('../middleware/customer');
const {isAdmin, isSecuredAdmin, enterPassword, isLoginRequire2faCode, adminRequire2faSetup, setup2fa, twoFa, twoFa2} = require('../middleware/admin');
const {isLoggedIn} = require('../middleware/loggedIn');
const {getUser, isCheckoutAsGuest, isGuest} = require('../middleware/cookie');
const {isArtworkRequired} = require('../middleware/checkout');
const {validatePhoneNumber, isCorrectAccount} = require('../validators/checkout'); 

router.get('/', getUser, homeController.getHomePage);
router.get('/terms-conditions', getUser, homeController.getTermsPage);
router.get('/shop', getUser, shopController.getShopTypePage)
router.get('/shop/:productName', getUser, shopController.getProductPage);
router.get('/get_option_types_and_options_for_product', getUser, shopController.getOptionTypesAndOptionsForProductByProductId)
router.get('/get_quantity_price_table_details', getUser, shopController.getQuantityPriceTableDetails);

router.get('/admin_dashboard', isAdmin, adminRequire2faSetup, adminDashboardController.getAdminDashboardPage);
router.get('/admin_dashboard/create_admin_account', isAdmin, adminRequire2faSetup, adminDashboardController.getCreateAdminPage);
router.post('/create_admin_account', isAdmin, adminRequire2faSetup, adminDashboardController.createAdmin);
router.get('/setup_2fa', isAdmin, adminDashboardController.getSetup2faPage);
router.post('/setup_2fa', isAdmin, setup2fa, adminDashboardController.setup2fa2Registration);

router.get('/admin/login', loginController.getAdminLoginPage);
router.post('/admin_login', isLoginRequire2faCode, loginController.adminLogin);
router.get('/admin/login/step_two', twoFa, twoFa2, loginController.adminLoginStepTwo);
router.post('/admin/login/step_two', twoFa, loginController.adminLogin);
router.get('/admin_dashboard/products', isAdmin, adminRequire2faSetup, adminDashboardController.getProductsPage);
router.get('/admin_dashboard/product/add_product', isAdmin, adminRequire2faSetup, adminDashboardController.getAddProductPage);
router.get('/admin_dashboard/product/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage);
router.get('/admin_dashboard/product_types', isAdmin, adminRequire2faSetup, adminDashboardController.getProductTypesPage);
router.get('/admin_dashboard/product_type/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getProductTypePage);
router.get('/getOptionsForOptionType', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionsForOptionType);
router.post('/create_product', isAdmin, adminRequire2faSetup, adminDashboardController.createProduct);
router.post('/edit_product', isAdmin, adminRequire2faSetup, adminDashboardController.editProduct);
router.post('/admin_dashboard/product_type/edit_product_type', isAdmin, adminRequire2faSetup, adminDashboardController.editProductType);
router.get('/get_option_types_and_option_for_product', adminDashboardController.getOptionTypesAndOptionForProduct);
router.post('/admin_dashboard/option/add', isAdmin, adminRequire2faSetup, adminDashboardController.addOption)
router.post('/admin_dashboard/option_type/add', isAdmin, adminRequire2faSetup, adminDashboardController.addOptionType)


router.post('/accept_cookie', homeController.acceptCookie);
router.get('/logout', isLoggedIn, loginController.logout);
router.get('/signup', getUser, isCustomer, signupController.getSignUpPage);
router.post('/signup', getUser, isCustomer, signupController.signup);
router.post('/signup/:checkout', getUser, isCustomer, signupController.signup);
router.get('/login', getUser, isCustomer, loginController.getLoginPage);
router.post('/login',getUser, isCustomer, loginController.login);
router.get('/forgot_password', getUser, isCustomer, homeController.getForgotPasswordPage);
router.post('/forgotten_password', getUser, isCustomer, homeController.requestForgottenPasswordEmail);

router.post('/add_to_basket', getUser, isCustomer, shopController.addToBasket);
router.get('/basket', getUser, isCustomer, shopController.getBasketPage);
router.delete('/remove_basket_item', getUser, isCustomer, shopController.deleteBasketItem);
router.put('/update_basket_quantity', getUser, isCustomer, shopController.updateBasketQuantity);
router.get('/design_upload/:basketItemId', getUser, isCustomer, shopController.getDesignUploadPage);
router.post('/design_upload', getUser, isCustomer, shopController.uploadDesign);
router.delete('/remove_file_group_item', getUser, isCustomer, shopController.removeFileGroupItem);
router.get('/checkout', getUser, isCustomer, isArtworkRequired, isCheckoutAsGuest, shopController.checkoutPage);
router.post('/checkout', getUser, isCustomer, isCheckoutAsGuest, shopController.checkout);
router.get('/checkout_login', getUser, isCustomer, isGuest, shopController.checkoutLoginPage);
router.post('/checkout_login', getUser, isCustomer, isGuest, loginController.checkoutLogin);
router.post('/checkout_as_guest', getUser, isCustomer, isGuest, shopController.checkoutAsGuest);
router.post('/admin_dashboard/product_type/add',isAdmin, adminRequire2faSetup, adminDashboardController.addProductType);
router.get('/admin_dashboard/add_product_type', isAdmin, adminRequire2faSetup, adminDashboardController.getAddProductTypePage);

router.get('/admin_dashboard/accounts', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountsPage);
router.get('/admin_dashboard/account/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountPage);
router.get('/admin_dashboard/account/:id/delete', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountDeletePage);
router.get('/admin_dashboard/account/:id/orders', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountOrdersPage);
router.get('/admin_dashboard/account/:id/emails', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountEmailsPage);

router.get('/admin_dashboard/order/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountOrderPage);
router.get('/admin_dashboard/orders', isAdmin, adminRequire2faSetup, adminDashboardController.getOrdersPage);
router.get('/admin_dashboard/option_types', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionTypesPage);
router.get('/admin_dashboard/option_type/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionTypePage);

router.get('/get_delivery_types', isAdmin, adminRequire2faSetup,adminDashboardController.getDeliveryTypes);
router.get('/get_delivery_type',  isAdmin, adminRequire2faSetup,adminDashboardController.getDeliveryType);
router.get('/validate_phone_number', validatePhoneNumber);
router.post('/stripe_webhooks/checkout.session.completed', shopController.sessionCompleted);
router.get('/purchase_successful/:id', getUser, isCustomer, isCorrectAccount, shopController.purchaseSuccessfulPage);
router.get('/404', getUser, isCustomer, homeController.getErrorPage);

router.get('/customer_search', getUser, isCustomer, homeController.searchProductOrProductTypes);
router.get('/get_refund_types', isAdmin, adminRequire2faSetup, adminDashboardController.getRefundTypes);
router.get('/get_outstanding_amount_for_order', isAdmin, adminRequire2faSetup, adminDashboardController.getOustandingAmountOfOrder);
router.post('/create_refund', isAdmin, adminRequire2faSetup, adminDashboardController.createRefund);

router.get('/account/:id/orders', getUser, isCustomer, isNotGuest, customerAccountController.getOrdersPage);
router.get('/order/:id', getUser, isCustomer, isNotGuest, customerAccountController.getOrderPage);
router.get('/account/:id/settings', getUser, isCustomer, isNotGuest, customerAccountController.getSettingsPage);
router.post('/edit_profile', getUser, isCustomer, isNotGuest, customerAccountController.editProfile)
router.post('/change_password', getUser, isCustomer, isNotGuest, customerAccountController.changePassword);
router.delete('/delete_account', getUser, isCustomer, isNotGuest, customerAccountController.deleteAccount);

router.get('/reset_password/account/:accountId/forgottenPassword/:token', getUser, isCustomer, homeController.resetPasswordPage);
router.post('/reset_password', getUser, isCustomer, homeController.resetPassword);
router.get('/password_reset', getUser, isCustomer, homeController.passwordResetPage);
router.get('/forgotten_password_email_sent', getUser, isCustomer, homeController.passwordEmailSentPage);

router.get('/get_notifications', isAdmin, adminRequire2faSetup, adminDashboardController.getNotifications);
router.delete('/delete_notification', isAdmin, adminRequire2faSetup, adminDashboardController.deleteNotification);
router.delete('/delete_all_notifications', isAdmin, adminRequire2faSetup, adminDashboardController.deleteNotifications);

router.get('/admin_dashboard/navigation_bar_options', isAdmin, adminRequire2faSetup, adminDashboardController.getNavigationBarPage);
router.post('/set_navigation_bar_headers', isAdmin, adminRequire2faSetup, adminDashboardController.setNavigationBarHeaders);
router.put('/admin_dashboard/home_page_option/update', isAdmin, adminRequire2faSetup, adminDashboardController.updateHomePage1To4);
router.put('/admin_dashboard/home_page_option_5_8/update', isAdmin, adminRequire2faSetup, adminDashboardController.updateHomePage5To8);
router.post('/admin_dashboard/home_page_banner/set', isAdmin, adminRequire2faSetup, adminDashboardController.setHomePageBanner);


router.get('/admin_dashboard/options_1_4', isAdmin, adminRequire2faSetup, adminDashboardController.getOptions1To4Page);
router.get('/admin_dashboard/options_5_8', isAdmin, adminRequire2faSetup, adminDashboardController.getOptions5To8Page);
router.get('/admin_dashboard/banner_section', isAdmin, adminRequire2faSetup, adminDashboardController.getBannerSectionPage);
module.exports = router
