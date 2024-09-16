const express = require('express');

const router = express.Router();
const adminDashboardController = require('../controllers/AdminDashboardController');
const customerAccountController = require('../controllers/CustomerAccountController');
const homeController = require('../controllers/HomeController');
const signupController = require('../controllers/SignupController');
const loginController = require('../controllers/LoginController');
const shopController = require('../controllers/ShopController');
const promoCodeController = require('../controllers/PromoCodeController');
const saleController = require('../controllers/SaleController');

const { isCustomer, isNotGuest } = require('../middleware/customer');
const {
  isAdmin, isLoginRequire2faCode, adminRequire2faSetup, setup2fa, twoFa, twoFa2,
} = require('../middleware/admin');
const { isLoggedIn } = require('../middleware/loggedIn');
const { getUser, isCheckoutAsGuest, isGuest } = require('../middleware/cookie');
const { isValidEditSession, isValidEdit } = require('../middleware/shop');
const { isArtworkRequired } = require('../middleware/checkout');
const { validatePhoneNumber, isCorrectAccount } = require('../validators/checkout');

router.get('/', getUser, homeController.getHomePage);
router.get('/about', getUser, homeController.getAboutPage);
router.get('/contact', getUser, homeController.getContactPage);
router.get('/terms-conditions', getUser, homeController.getTermsPage);
router.get('/privacy-policy', getUser, homeController.getPrivacyPage);
router.get('/faqs', getUser, homeController.getFaqsPage);
router.get('/faq/:id', getUser, homeController.getFaqPage);

router.get('/shop', getUser, shopController.getShopTypePage);
router.get('/shop/:productName', getUser, isValidEditSession, shopController.getProductPage);
router.get(
  '/product/:id/get-price-matrix-option-types-and-options',
  getUser,
  shopController.getPricingMatrixOptionTypesAndOptionsForProduct,
);
router.get(
  '/product/:id/get-finishing-matrix-option-types-and-options',
  getUser,
  shopController.getFinishingMatrixOptionTypesAndOptionsForProduct,
);
router.get('/get-quantity-price-table-details', getUser, shopController.getQuantityPriceTableDetails);

router.get('/admin-dashboard', isAdmin, adminRequire2faSetup, adminDashboardController.getAdminDashboardPage);
router.get('/admin-dashboard/create-admin-account', isAdmin, adminRequire2faSetup, adminDashboardController.getCreateAdminPage);
router.post('/create-admin-account', isAdmin, adminRequire2faSetup, adminDashboardController.createAdmin);
router.get('/setup-2fa', isAdmin, adminDashboardController.getSetup2faPage);
router.post('/setup-2fa', isAdmin, setup2fa, adminDashboardController.setup2fa2Registration);

router.get('/admin/login', loginController.getAdminLoginPage);
router.post('/admin-login', isLoginRequire2faCode, loginController.adminLogin);
router.get('/admin/login/step-two', twoFa, twoFa2, loginController.adminLoginStepTwo);
router.post('/admin/login/step-two', twoFa, loginController.adminLogin);
router.get('/admin-dashboard/products', isAdmin, adminRequire2faSetup, adminDashboardController.getProductsPage);
router.get('/admin-dashboard/product/:id/page1', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage1);
router.get('/admin-dashboard/product/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage);
router.post('/admin-dashboard/product/page1/save', isAdmin, adminRequire2faSetup, adminDashboardController.savePage1);
router.post('/admin-dashboard/product/page1/continue', isAdmin, adminRequire2faSetup, adminDashboardController.continuePage1);
router.get('/admin-dashboard/product/:id/page2', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage2);
router.get('/admin-dashboard/product/:id/page3', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage3);
router.get('/admin-dashboard/product/:id/page4', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage4);
router.get('/admin-dashboard/product/:id/page5', isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage5);
// router.get("/admin-dashboard/product/:id/page6", isAdmin, adminRequire2faSetup, adminDashboardController.getProductPage6);

router.get('/admin-dashboard/product/:id/activate', isAdmin, adminRequire2faSetup, adminDashboardController.getActivatePage);
router.get('/admin-dashboard/product/:id/deactivate', isAdmin, adminRequire2faSetup, adminDashboardController.getDeactivatePage);
router.get('/admin-dashboard/sales', isAdmin, adminRequire2faSetup, saleController.getSalesPage);
router.get('/admin-dashboard/promo-codes', isAdmin, adminRequire2faSetup, promoCodeController.getPromoCodesPage);
router.get('/admin-dashboard/promo-code/create', isAdmin, adminRequire2faSetup, promoCodeController.getCreatePromoCodePage);
router.post('/admin-dashboard/promo-code/create', isAdmin, adminRequire2faSetup, promoCodeController.createPromoCode);

router.get('/admin-dashboard/promo-code/:id', isAdmin, adminRequire2faSetup, promoCodeController.getPromoCodePage);

router.get('/promo-codes', isAdmin, adminRequire2faSetup, promoCodeController.getPromoCodeTypes);
router.post('/admin-dashboard/product/:id/page3/continue', isAdmin, adminRequire2faSetup, adminDashboardController.continuePage3);
router.post('/admin-dashboard/product/:id/page4/continue', isAdmin, adminRequire2faSetup, adminDashboardController.continuePage4);

router.get('/product/:id/verify-quantities', isAdmin, adminRequire2faSetup, adminDashboardController.verifyQuantities);
router.post('/product/:id/save-quantities', isAdmin, adminRequire2faSetup, adminDashboardController.saveQuantities);
router.get('/product/:id/get-quantities', isAdmin, adminRequire2faSetup, adminDashboardController.getQuantities);
router.get('/product/:id/get-price-matrix-rows', isAdmin, adminRequire2faSetup, adminDashboardController.getPriceMatrixRows);
router.post(
  '/product/:id/save-printing-attributes',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.savePrintingAttributes,
);
router.post(
  '/product/:id/save-finishing-attributes',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.saveFinishingAttributes,
);
router.post('/product/:id/save-delivery-options', isAdmin, adminRequire2faSetup, adminDashboardController.saveDeliveryOptions);

router.get(
  '/products/no-active-promo-code/:fromDt/:toDt',
  isAdmin,
  adminRequire2faSetup,
  promoCodeController.getProductWithNoActivePromoCodes,
);
router.get(
  '/products/no-active-promo-code/promo-code/:id/:fromDt/:toDt',
  isAdmin,
  adminRequire2faSetup,
  promoCodeController.getProductWithNoActivePromoCodesForPromoCode,
);
router.get('/promo-code/:id/products', isAdmin, adminRequire2faSetup, promoCodeController.getPromoCodeProducts);
router.post('/admin-dashboard/promo-code/:id/update', isAdmin, adminRequire2faSetup, promoCodeController.updatePromoCode);

router.get(
  '/products/no-active-sale/:fromDt/:toDt',
  isAdmin,
  adminRequire2faSetup,
  saleController.getProductWithNoActiveSales,
);
router.get(
  '/products/no-active-sale/sale/:id/:fromDt/:toDt',
  isAdmin,
  adminRequire2faSetup,
  saleController.getProductWithNoActiveSalesForSale,
);

router.post('/admin-dashboard/sale/create', isAdmin, adminRequire2faSetup, saleController.createSale);
router.get('/admin-dashboard/sale/:id', isAdmin, adminRequire2faSetup, saleController.getSalePage);
router.post('/admin-dashboard/sale/:id/update', isAdmin, adminRequire2faSetup, saleController.updateSale);
router.get('/sale/:id/products', isAdmin, adminRequire2faSetup, saleController.getSaleProducts);

router.delete('/sale/:id/delete', isAdmin, adminRequire2faSetup, saleController.deleteSale);

router.get('/product/:id/get-finishing-matrices', isAdmin, adminRequire2faSetup, adminDashboardController.getFinishingMatrices);
router.get('/product/:id/get-product-deliveries', isAdmin, adminRequire2faSetup, adminDashboardController.getProductDeliveries);
router.get('/product/:id/validate', isAdmin, adminRequire2faSetup, adminDashboardController.validate);
router.post('/product/:id/activate', isAdmin, adminRequire2faSetup, adminDashboardController.activate);
router.post('/product/:id/deactivate', isAdmin, adminRequire2faSetup, adminDashboardController.deactivate);

router.get('/admin-dashboard/product-types', isAdmin, adminRequire2faSetup, adminDashboardController.getProductTypesPage);
router.get('/admin-dashboard/product-type/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getProductTypePage);
router.get('/get-options-for-option-type', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionsForOptionType);
router.post('/create-product', isAdmin, adminRequire2faSetup, adminDashboardController.createProduct);
router.post('/edit-product', isAdmin, adminRequire2faSetup, adminDashboardController.editProduct);
router.post(
  '/admin-dashboard/product-type/edit-product-type',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.editProductType,
);
router.get('/get-option-types-and-option-for-product', adminDashboardController.getOptionTypesAndOptionForProduct);
router.post('/admin-dashboard/option/add', isAdmin, adminRequire2faSetup, adminDashboardController.addOption);
router.post('/admin-dashboard/option-type/add', isAdmin, adminRequire2faSetup, adminDashboardController.addOptionType);
router.get('/admin-dashboard/option/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionPage);
router.post('/option/:id/update', isAdmin, adminRequire2faSetup, adminDashboardController.updateOptionName);

router.get('/admin-dashboard/templates', isAdmin, adminRequire2faSetup, adminDashboardController.getTemplatesPage);
router.get('/admin-dashboard/add-template', isAdmin, adminRequire2faSetup, adminDashboardController.getAddTemplatePage);
router.post('/admin-dashboard/template/add', isAdmin, adminRequire2faSetup, adminDashboardController.addTemplate);
router.get('/admin-dashboard/template/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getTemplatePage);
router.put('/admin-dashboard/template/:id', isAdmin, adminRequire2faSetup, adminDashboardController.editTemplate);

router.get('/admin-dashboard/faqs', isAdmin, adminRequire2faSetup, adminDashboardController.getFaqsPage);
router.get('/admin-dashboard/add-faq', isAdmin, adminRequire2faSetup, adminDashboardController.getAddFaqPage);
router.post('/admin-dashboard/faq/add', isAdmin, adminRequire2faSetup, adminDashboardController.addFaq);
router.get('/admin-dashboard/faq/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getFaqPage);
router.put('/admin-dashboard/faq/:id', isAdmin, adminRequire2faSetup, adminDashboardController.editFaq);

router.post('/accept-cookie', homeController.acceptCookie);
router.get('/logout', isLoggedIn, loginController.logout);
router.get('/signup', getUser, isCustomer, signupController.getSignUpPage);
router.post('/signup', getUser, isCustomer, signupController.signup);
router.post('/signup/:checkout', getUser, isCustomer, signupController.signup);
router.get('/login', getUser, isCustomer, loginController.getLoginPage);
router.post('/login', getUser, isCustomer, loginController.login);
router.get('/forgot-password', getUser, isCustomer, homeController.getForgotPasswordPage);
router.post('/forgotten-password', getUser, homeController.requestForgottenPasswordEmail);

router.post('/basket/apply-promo-code', isCustomer, promoCodeController.applyPromoCode);
router.post('/basket/remove-promo-code', isCustomer, promoCodeController.removePromoCode);
router.post('/add-to-basket', getUser, isCustomer, shopController.addToBasket);
router.post('/edit-basket-item', getUser, isCustomer, isValidEdit, shopController.editBasketItem);
router.get('/basket', getUser, isCustomer, shopController.getBasketPage);
router.delete('/remove-basket-item', getUser, isCustomer, shopController.deleteBasketItem);
router.put('/update-basket-quantity', getUser, isCustomer, shopController.updateBasketQuantity);
router.get('/design-upload/:basketItemId', getUser, isCustomer, shopController.getDesignUploadPage);
router.post('/design-upload', getUser, isCustomer, shopController.uploadDesign);
router.delete('/remove-file-group-item', getUser, isCustomer, shopController.removeFileGroupItem);
router.get('/checkout', getUser, isCustomer, isArtworkRequired, isCheckoutAsGuest, shopController.checkoutPage);
router.post('/checkout', getUser, isCustomer, isCheckoutAsGuest, shopController.checkout);
router.get('/checkout-login', getUser, isCustomer, isGuest, shopController.checkoutLoginPage);
router.post('/checkout-login', getUser, isCustomer, isGuest, loginController.checkoutLogin);
router.post('/checkout-as-guest', getUser, isCustomer, isGuest, shopController.checkoutAsGuest);
router.post('/admin-dashboard/product-type/add', isAdmin, adminRequire2faSetup, adminDashboardController.addProductType);
router.get('/admin-dashboard/add-product-type', isAdmin, adminRequire2faSetup, adminDashboardController.getAddProductTypePage);

router.get('/admin-dashboard/add-sale', isAdmin, adminRequire2faSetup, saleController.getAddSalePage);

router.get('/admin-dashboard/accounts', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountsPage);
router.get('/admin-dashboard/account/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountPage);
router.get('/admin-dashboard/account/:id/delete', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountDeletePage);
router.get('/admin-dashboard/account/:id/orders', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountOrdersPage);
router.get('/admin-dashboard/account/:id/emails', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountEmailsPage);

router.get('/admin-dashboard/order/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getAccountOrderPage);
router.get('/admin-dashboard/orders', isAdmin, adminRequire2faSetup, adminDashboardController.getOrdersPage);
router.get('/admin-dashboard/option-types', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionTypesPage);
router.get('/admin-dashboard/option-type/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getOptionTypePage);

router.get('/get-delivery-types', isAdmin, adminRequire2faSetup, adminDashboardController.getDeliveryTypes);
router.get('/get-delivery-type', isAdmin, adminRequire2faSetup, adminDashboardController.getDeliveryType);
router.get('/validate-phone-number', validatePhoneNumber);
router.post('/stripe_webhooks/checkout.session.completed', shopController.sessionCompleted);
router.get('/purchase-successful/:id', getUser, isCustomer, isCorrectAccount, shopController.purchaseSuccessfulPage);
router.get('/404', getUser, isCustomer, homeController.getErrorPage);

router.get('/faq-search', getUser, homeController.searchQuestionsAndAnswers);

router.get('/customer-search', getUser, isCustomer, homeController.searchProductOrProductTypes);
router.get('/get-refund-types', isAdmin, adminRequire2faSetup, adminDashboardController.getRefundTypes);
router.get(
  '/get-outstanding-amount-for-order',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.getOustandingAmountOfOrder,
);
router.post('/create-refund', isAdmin, adminRequire2faSetup, adminDashboardController.createRefund);

router.get('/account/:id/orders', getUser, isCustomer, isNotGuest, customerAccountController.getOrdersPage);
router.get('/order/:id', getUser, isCustomer, isNotGuest, customerAccountController.getOrderPage);
router.get('/account/:id/settings', getUser, isCustomer, isNotGuest, customerAccountController.getSettingsPage);
router.post('/edit-profile', getUser, isCustomer, isNotGuest, customerAccountController.editProfile);
router.post('/change-password', getUser, isCustomer, isNotGuest, customerAccountController.changePassword);
router.delete('/delete-account', getUser, isCustomer, isNotGuest, customerAccountController.deleteAccount);
router.delete('/account/:id/deactivate', isAdmin, adminRequire2faSetup, adminDashboardController.deactivateAccount);
router.put('/account/:id/reactivate', isAdmin, adminRequire2faSetup, adminDashboardController.reactivateAccount);

router.get('/reset-password/account/:accountId/forgottenPassword/:token', getUser, isCustomer, homeController.resetPasswordPage);
router.post('/reset-password', getUser, isCustomer, homeController.resetPassword);
router.get('/password-reset', getUser, isCustomer, homeController.passwordResetPage);
router.get('/forgotten-password-email-sent', getUser, isCustomer, homeController.passwordEmailSentPage);

router.get('/get-notifications', isAdmin, adminRequire2faSetup, adminDashboardController.getNotifications);
router.delete('/delete-notification', isAdmin, adminRequire2faSetup, adminDashboardController.deleteNotification);
router.delete('/delete-all-notifications', isAdmin, adminRequire2faSetup, adminDashboardController.deleteNotifications);

router.get(
  '/admin-dashboard/navigation-bar-options',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.getNavigationBarPage,
);
router.post('/set-navigation-bar-headers', isAdmin, adminRequire2faSetup, adminDashboardController.setNavigationBarHeaders);

router.put('/home-page-option/:id/update', isAdmin, adminRequire2faSetup, adminDashboardController.updateHomePageOption);

router.put('/home-page-option/:id/remove', isAdmin, adminRequire2faSetup, adminDashboardController.removeHomePageOption);

router.get('/admin-dashboard/home-page-options', isAdmin, adminRequire2faSetup, adminDashboardController.getHomePageOptions);

router.get('/admin-dashboard/home-page-option/:id', isAdmin, adminRequire2faSetup, adminDashboardController.getHomePageOption);

router.post('/admin-dashboard/home-page-banner/set', isAdmin, adminRequire2faSetup, adminDashboardController.setHomePageBanner);
router.post(
  '/admin-dashboard/home-page-main-banner/set',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.setHomePageMainBanner,
);

router.get('/admin-dashboard/banner-section', isAdmin, adminRequire2faSetup, adminDashboardController.getBannerSectionPage);
router.get(
  '/admin-dashboard/main-banner-section',
  isAdmin,
  adminRequire2faSetup,
  adminDashboardController.getMainBannerSectionPage,
);

router.post('/product/:id/clone', isAdmin, adminRequire2faSetup, adminDashboardController.cloneProduct);

module.exports = router;
