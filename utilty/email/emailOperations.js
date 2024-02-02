const models = require('../../models');
const nodeMailer = require('nodemailer');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const hbs = require('handlebars');
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
        pass: process.env.MAILSERVER_PASSWORD
    }
});

const compile = async function (templateName, data) {
    const filePath = path.join(process.cwd(), 'templates', `${templateName}.hbs`);
    const html = await fs.readFile(filePath, 'utf-8');

    return hbs.compile(html)(data);
}

hbs.registerHelper('dateFormat', (value, format) => {
    console.log('formatting', value, format);
    return moment(value).format(format);
});

async function sendForgottenPasswordEmail(accountId) {

    const transaction = await models.sequelize.transaction();

    try {
        const account = await accountOperations.getAccountById(accountId);
        const forgottenPassword = await accountOperations.createForgottenPasswordRequest(account.id);
        const link = `${process.env.WEBSITE_URL}reset_password/account/${account.id}/forgottenPassword/${forgottenPassword.token}`;

        const data = { link: link, url: process.env.WEBSITE_URL, logo: process.env.COMPANY_LOGO };
        const content = await compile('forgottenPasswordEmail', data);

        const subject = 'Bluwave - Forgotten Password';
        const mailOptions = {
            from: process.env.MAILSERVER_EMAIL,
            to: account.email,
            subject: subject,
            html: content
        }

        smtpTransport.sendMail(mailOptions, async (errors, res) => {
            console.log(res);
            console.log(errors);
            await createEmail(errors, account.email, subject);
        });


    } catch (err) {
        console.log(err);

        await transaction.rollback();
        return;
    }

    await transaction.commit();

}

async function sendSigupEmail(accountId) {

    const transaction = await models.sequelize.transaction();

    try {
        const account = await accountOperations.getAccountById(accountId);
        const data = { name: account.name, company: process.env.COMPANY_NAME, url: process.env.WEBSITE_URL, logo: process.env.COMPANY_LOGO };

        const content = await compile('signupEmail', data);

        const subject = 'Bluwave - Registration';
        const mailOptions = {
            from: process.env.MAILSERVER_EMAIL,
            to: account.email,
            subject: subject,
            html: content
        }

        smtpTransport.sendMail(mailOptions, async (errors, res) => {
            console.log(res);
            console.log(errors);
            await createEmail(errors, account.email, subject);
        });


    } catch (err) {
        console.log(err);

        await transaction.rollback();
        return;
    }

    await transaction.commit();

}

async function sendPurchaseEmail(purchaseBasketId) {

    const transaction = await models.sequelize.transaction();

    try {
        var order = await orderOperations.getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId);
        order['total'] = (parseFloat(order.total)).toFixed(2);

        const shippingDetailFk = order.shippingDetailFk;

        const shippingDetail = (shippingDetailFk == null) ? null : await deliveryOperations.getShippingDetailById(shippingDetailFk);
        const orderItems = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId);
        const revisedOrderItems = orderItems.map(item => {
            return { ...item, cost: (parseFloat(item.price)/parseFloat(item.quantity)).toFixed(2) }; // Replace 'new_value' with the desired value for field 'c'
        }); 

        const data = {
            name: order.fullName,
            email: order.email,
            phone: order.phoneNumber,
            orderNumber: order.orderNumber,
            date: order.purchaseDt,
            subTotal: order.subTotal,
            deliveryType: order.deliveryType,
            deliveryPrice: order.deliveryPrice,
            total: order.total,
            addressLine1: shippingDetail.addressLine1,
            addressLine2: shippingDetail.addressLine2,
            city: shippingDetail.city,
            postCode: shippingDetail.postCode,
            orderItems: revisedOrderItems,
            collect: shippingDetail == null,
            company: process.env.COMPANY_NAME,
            url: process.env.WEBSITE_URL,
            logo: process.env.COMPANY_LOGO
        };

    
        const content = await compile('purchaseEmail', data);

        const subject = 'Bluwave - Thanks for your order!';
        const mailOptions = {
            from: process.env.MAILSERVER_EMAIL,
            to: order.email,
            subject: subject,
            html: content
        }

        smtpTransport.sendMail(mailOptions, async (errors, res) => {
            console.log(errors);
            await createEmail(errors, order.email, subject);
        });
    } catch (err) {
        console.log(err);

        await transaction.rollback();
        return;
    }

    await transaction.commit();

}

async function getEmailsForByEmailAddress(email) {
    return await models.sequelize.query('select *, DATE_FORMAT(sentDttm, "%Y-%m-%d %H:%i:%s") as sentDt from emails ' +
                    ' where recipientEmail = :email ' +
                    ' and deleteFl = false', {replacements: {email: email}, type: models.sequelize.QueryTypes.SELECT});
}

async function createEmail(errors, recipientEmail, subject) {
    return await models.email.create({
        recipientEmail: recipientEmail,
        subject: subject,
        sentDttm: Date.now(),
        status: (errors) ? 'Failed' : 'Success',
        deleteFl: false,
        versionNo: 1
    })
}

module.exports = {
    sendForgottenPasswordEmail,
    sendSigupEmail,
    sendPurchaseEmail,
    getEmailsForByEmailAddress
}