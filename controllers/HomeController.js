const companyInfo = require('../utilty/company/companyInfo');
const productOperations = require('../utilty/products/productOperations');
const accountOperations = require('../utilty/account/accountOperations');
const basketOperations = require('../utilty/basket/basketOperations');

const notProduction = process.env.NODE_ENV !== 'production';

const queueOperations = !notProduction
  ? require('../utilty/queue/queueOperations')
  : null;
const faqOperations = require('../utilty/faq/faqOperations');

async function parseHomePageOptions(from, to, homePageOptions) {
  const options = [];
  for (let i = from; i <= to; i += 1) {
    const productTypeId = homePageOptions[`productTypeFk${i}`];
    if (productTypeId !== null && productTypeId !== undefined) {
      options.push({
        productType: await productOperations.getProductTypeById(productTypeId),
        imagePath: homePageOptions[`imagePath${i}`],
        description: homePageOptions[`description${i}`],
      });
    }
  }
  await Promise.all(options);

  return options;
}

async function getHomePage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;

  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  const homePageBannerSection = await productOperations.getHomePageBannerSection();
  if (homePageBannerSection !== null) {
    homePageBannerSection.productType = await productOperations.getProductTypeById(
      homePageBannerSection.productTypeFk,
    );
  }

  const homePageMainBannerSection = await productOperations.getHomePageMainBannerSection();

  const homePageOptions = await productOperations.getHomePageOptions();

  const homePageOptions1To4 = await parseHomePageOptions(1, 4, homePageOptions);
  const homePageOptions5To8 = await parseHomePageOptions(5, 8, homePageOptions);

  res.render('home', {
    user: req.user,
    basketItems,
    displayCookieMessage,
    navigationBarHeaders,
    allProductTypes,
    homePageOptions1To4,
    homePageOptions5To8,
    homePageBannerSection,
    homePageMainBannerSection,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getAboutPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('about', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getContactPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('contact', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getTermsPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('terms', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getPrivacyPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('privacy', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getFaqsPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const faqsGroupedByTypes = await faqOperations.getFaqsGroupedByType();

  res.render('faqs', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    faqsGroupedByTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getFaqPage(req, res) {
  const basketItems = await basketOperations.getActiveBasketItemsForAccount(
    req.user.id,
  );
  const { displayCookieMessage } = req.body;
  const navigationBarHeaders = await productOperations.getNavigationBarHeadersAndProducts();
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  const { id } = req.params;
  const faq = await faqOperations.getFaq(id);

  res.render('faq', {
    user: req.user,
    navigationBarHeaders,
    basketItems,
    displayCookieMessage,
    allProductTypes,
    faq,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function acceptCookie(req, res) {
  const { id } = req.user;
  const activeCookie = await accountOperations.getActiveCookie(id);

  if (activeCookie !== null) {
    await accountOperations.acceptCookie(activeCookie.id);
    return res.status(200).json({});
  }

  return res.status(400).json({});
}

function getErrorPage(req, res) {
  res.render('404', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function getForgotPasswordPage(req, res) {
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('forgotPassword', {
    user: req.user,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function searchProductOrProductTypes(req, res) {
  const { search } = req.query;

  const products = await productOperations.searchProductsByName(search);
  const productTypes = await productOperations.searchProductTypesByName(search);

  const searchResult = [...products, ...productTypes];

  res.status(200).json(searchResult);
}

async function searchQuestionsAndAnswers(req, res) {
  const { search } = req.query;

  const questions = await faqOperations.searchQuestionsAnswers(search);

  res.status(200).json(questions);
}

async function requestForgottenPasswordEmail(req, res) {
  const { email } = req.body;

  const account = await accountOperations.findAccountByEmail(email);

  if (account !== null) {
    await queueOperations.addForgottenPasswordEmailJob(account.id);
    req.session.message = 'Reset Email Sent!';
    return res.status(200).json({});
  }
  return res.status(400).json({ error: 'No Account found with this email' });
}

async function resetPasswordPage(req, res) {
  const { accountId } = req.params;
  const { token } = req.params;

  const forgottenPassword = await accountOperations.getForgottenPassword(
    accountId,
    token,
  );
  const allProductTypes = await productOperations.getAllActiveProductTypes();
  if (forgottenPassword == null) {
    // link has expired
    // or used
    //
    return res.render('resetPassword', {
      user: req.user,
      error: {},
      allProductTypes,
      companyDetails: companyInfo.getCompanyDetails(),
    });
  }
  return res.render('resetPassword', {
    user: req.user,
    forgottenPasswordId: forgottenPassword.id,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function resetPassword(req, res) {
  const { password } = req.body;
  const { rePassword } = req.body;

  if (password !== rePassword) {
    return res.status(400).json({ error: "Passwords don't match" });
  }

  const { forgottenPasswordId } = req.body;
  const forgettenPassword = await accountOperations.getForgottenPasswordById(
    forgottenPasswordId,
  );

  if (forgettenPassword == null) {
    const invalidForgettenPassword = await accountOperations.findForgottenPasswordById(forgottenPasswordId);
    return res
      .status(400)
      .json({
        error: 'Link Expired',
        token: invalidForgettenPassword.token,
        accountId: invalidForgettenPassword.accountFk,
      });
  }

  await accountOperations.updatePassword(forgettenPassword.accountFk, password);
  await accountOperations.updateForgottenPasswordAsUsed(forgottenPasswordId);
  return res.status(200).json({});
}

async function passwordResetPage(req, res) {
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('passwordReset', {
    user: req.user,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function passwordEmailSentPage(req, res) {
  const allProductTypes = await productOperations.getAllActiveProductTypes();

  res.render('forgottenPasswordEmailSentPage', {
    user: req.user,
    allProductTypes,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

module.exports = {
  acceptCookie,
  getAboutPage,
  getContactPage,
  getErrorPage,
  getFaqPage,
  getFaqsPage,
  getForgotPasswordPage,
  getHomePage,
  getPrivacyPage,
  searchProductOrProductTypes,
  getTermsPage,
  parseHomePageOptions,
  passwordEmailSentPage,
  passwordResetPage,
  requestForgottenPasswordEmail,
  resetPassword,
  resetPasswordPage,
  searchQuestionsAndAnswers,
};
