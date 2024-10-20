const nodeMailer = require('nodemailer');
const logger = require('pino')();
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const hbs = require('handlebars');
const models = require('../../models');
const accountOperations = require('../account/accountOperations');
const basketOperations = require('../basket/basketOperations');
const deliveryOperations = require('../delivery/deliveryOperations');
const orderOperations = require('../order/orderOperations');

const smtpTransport = nodeMailer.createTransport({
  host: process.env.MAILSERVER_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILSERVER_EMAIL,
    pass: process.env.MAILSERVER_PASSWORD,
  },
});

async function compile(templateName, data) {
  const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
  const html = await fs.readFile(filePath, 'utf-8');

  return hbs.compile(html)(data);
}

hbs.registerHelper('dateFormat', (value, format) => {
  logger.info('formatting', value, format);
  return moment(value).format(format);
});

async function createEmail(errors, recipientEmail, subject) {
  return models.email.create({
    recipientEmail,
    subject,
    sentDttm: Date.now(),
    status: errors ? 'Failed' : 'Success',
    deleteFl: false,
    versionNo: 1,
  });
}

async function sendForgottenPasswordEmail(accountId) {
  const transaction = await models.sequelize.transaction();

  try {
    const account = await accountOperations.getAccountById(accountId);
    const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
    const link = `${process.env.WEBSITE_URL}reset-password/account/${account.id}/forgottenPassword/${forgottenPassword.token}`;

    const data = {
      link,
      url: process.env.WEBSITE_URL,
      logo: process.env.COMPANY_LOGO,
    };
    const content = await compile('forgottenPasswordEmail', data);

    const subject = 'Bluwave - Forgotten Password';
    const mailOptions = {
      from: process.env.MAILSERVER_EMAIL,
      to: account.email,
      subject,
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors, res) => {
      logger.info(res);
      logger.info(errors);
      await createEmail(errors, account.email, subject);
    });
  } catch (err) {
    logger.info(err);

    await transaction.rollback();
    return;
  }

  await transaction.commit();
}

async function sendSigupEmail(accountId) {
  const transaction = await models.sequelize.transaction();

  try {
    const account = await accountOperations.getAccountById(accountId);
    const data = {
      name: account.name,
      company: process.env.COMPANY_NAME,
      url: process.env.WEBSITE_URL,
      logo: process.env.COMPANY_LOGO,
    };

    const content = await compile('signupEmail', data);

    const subject = 'Bluwave - Registration';
    const mailOptions = {
      from: process.env.MAILSERVER_EMAIL,
      to: process.env.NODE_ENV === 'production' ? account.email : process.env.LOGIN_USERNAME,
      subject,
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors, res) => {
      logger.info(res);
      logger.info(errors);
      await createEmail(errors, account.email, subject);
    });
  } catch (err) {
    logger.info(err);

    await transaction.rollback();
    return;
  }

  await transaction.commit();
}

async function sendPurchaseEmail(purchaseBasketId) {
  const transaction = await models.sequelize.transaction();

  try {
    const order = await orderOperations.getSuccessfulOrderForPurchaseBasketId(
      purchaseBasketId,
    );
    // order.total = parseFloat(order.total).toFixed(2);

    const { shippingDetailFk } = order;

    const shippingDetail = shippingDetailFk == null
      ? null
      : await deliveryOperations.getShippingDetailById(shippingDetailFk);

    const {
      basketItems, sale, code, totalSaleAmount, totalPromoCodeAmount,
    } = await basketOperations.getBasketItemsForOrderId(
      purchaseBasketId,
    );
    // const revisedOrderItems = orderItems.map(
    //   (item) => ({
    //     ...item,
    //     cost: (parseFloat(item.price) / parseFloat(item.quantity)).toFixed(2),
    //   }), // Replace 'new_value' with the desired value for field 'c'
    // );

    // const sales = orderItems
    //   .filter((o) => o.saleFk !== null)
    //   .map((item) => ({
    //     name: `${item.saleName} ${item.percentage}% off`,
    //     discountAmount: parseFloat(item.price - item.subTotal).toFixed(2),
    //   }));

    const data = {
      name: order.fullName,
      email: order.email,
      phone: order.phoneNumber,
      orderNumber: order.orderNumber,
      date: order.purchaseDt,
      subTotal: order.subTotal,
      deliveryType: order.deliveryType,
      deliveryPrice: order.deliveryPrice,
      total: parseFloat(order.total).toFixed(2),
      orderItems: basketItems,
      collect: shippingDetail == null,
      company: process.env.COMPANY_NAME,
      url: process.env.WEBSITE_URL,
      logo: process.env.COMPANY_LOGO,
      sale,
      totalSaleAmount,
      code,
      totalPromoCodeAmount,
    };

    if (shippingDetail) {
      data.addressLine1 = shippingDetail.addressLine1;
      data.addressLine2 = shippingDetail.addressLine2;
      data.city = shippingDetail.city;
      data.postCode = shippingDetail.postCode;
    }

    const content = await compile('purchaseEmail', data);

    const subject = 'Bluwave - Thanks for your order!';
    const mailOptions = {
      from: process.env.MAILSERVER_EMAIL,
      to: order.email,
      subject,
      html: content,
    };

    smtpTransport.sendMail(mailOptions, async (errors) => {
      logger.info(errors);
      await createEmail(errors, order.email, subject);
    });
  } catch (err) {
    logger.info(err);

    await transaction.rollback();
    return;
  }

  await transaction.commit();
}

async function getEmailsForByEmailAddress(email) {
  return models.sequelize.query(
    'select *, DATE_FORMAT(sentDttm, "%Y-%m-%d %H:%i:%s") as sentDt from emails '
      + ' where recipientEmail = :email '
      + ' and deleteFl = false',
    { replacements: { email }, type: models.sequelize.QueryTypes.SELECT },
  );
}

module.exports = {
  sendForgottenPasswordEmail,
  sendSigupEmail,
  sendPurchaseEmail,
  getEmailsForByEmailAddress,
};
