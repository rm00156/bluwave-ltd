const models = require('../../models');
const utiltyHelper = require('../general/utilityHelper');
const Sequelize = require('sequelize');

async function createAccount(accountTypeFk, email, name, phoneNumber, password) {

    const accountNumber = await getNewAccountNumber();
    const transaction = await models.sequelize.transaction();
    var account;
    try {
        account = await models.account.create({
            email: email,
            phoneNumber: phoneNumber,
            password: utiltyHelper.generateHash(password),
            name: name,
            accountTypeFk: accountTypeFk,
            createdAt: Date.now(),
            accountNumber: accountNumber,
            guestFl: false,
            deleteFl: false,
            versionNo: 1
        })
    } catch (err) {
        console.log(err);
        await transaction.rollback();
        throw 'error with account sign up';
    }
    await transaction.commit();
    return account;
}

async function createGuestAccount(res) {

    const accountNumber = await getNewAccountNumber();
    const transaction = await models.sequelize.transaction();
    var account;
    var email;
    try {
        account = await models.account.create({
            email: 'temp@temp.com',
            phoneNumber: '00000000000',
            password: utiltyHelper.generateHash('welcome'),
            name: `temp`,
            accountTypeFk: 2,
            createdAt: Date.now(),
            accountNumber: accountNumber,
            guestFl: true,
            deleteFl: false,
            versionNo: 1
        });

        email = `temp${account.id}@temp.com`;
        await models.account.update({
            email: email
        }, {
            where: {
                id: account.id
            }
        });

        await createCookie(account.id, 60000 * 60 * 24 * 7, res);
    } catch (err) {
        console.log(err);
        await transaction.rollback();
        throw 'error with guest creation';
    }
    await transaction.commit();
    return email;
}

async function getCookie(accountId) {

    return await models.cookie.findOne({
        where: {
            accountFk: accountId
        }
    })
}

async function getActiveCookie(accountId) {

    return await models.cookie.findOne({
        where: {
            accountFk: accountId,
            expirationDttm: {
                [Sequelize.Op.gt]: Date.now() // Specify the field name and comparison operator
            }
        }
    })
}

async function updateCookieExpirationDate(cookieId, expirationDttm, res, maxAge) {
    await models.cookie.update({
        expirationDttm: expirationDttm,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: cookieId,
        }
    });

    res.clearCookie('bluwave_ecommerce_user_data');
    const userData = { id: cookieId };
    res.cookie('bluwave_ecommerce_user_data', userData, { httpOnly: true, maxAge: maxAge });

}

async function createCookie(accountId, expires, res) {

    const expirationDttm = new Date(Date.now() + (expires));

    const existingActiveCookie = await getActiveCookie(accountId);
    const userData = { id: accountId };
    if (existingActiveCookie == null) {
        res.cookie('bluwave_ecommerce_user_data', userData, { httpOnly: true, maxAge: expires });
        return await models.cookie.create({
            accountFk: accountId,
            createdDttm: Date.now(),
            expirationDttm: expirationDttm,
            acceptedFl: false,
            deleteFl: false,
            versionNo: 1
        })
    } else {
        await updateCookieExpirationDate(existingActiveCookie.id, expirationDttm, res, expires);
    }
}

async function findAccountByEmail(email) {
    return await models.account.findOne({
        where: {
            email: email,
            deleteFl: false
        }
    });
}

async function findAccountById(id) {
    return await models.account.findOne({
        where: {
            id: id,
            deleteFl: false
        }
    });
}

async function getAccountById(id) {
    const result = await models.sequelize.query('select a.*, at.accountType from accounts a ' +
        ' inner join accountTypes at on a.accountTypeFk = at.id ' +
        ' where a.id = :id ', { replacements: { id: id }, type: models.sequelize.QueryTypes.SELECT });

    if (result.length == 0) {
        return null;
    } else {
        return result[0];
    }
}

async function getNewAccountNumber() {
    var code = utiltyHelper.generateNumberCode();

    var account = await models.account.findOne({
        where: {
            accountNumber: code
        }
    });

    if (account == null)
        return code;

    return await getNewAccountNumber();
}

async function complete2FaSetupForAccountId(accountId, secret) {
    const transaction = await models.sequelize.transaction();
    try {
        await models.twoFactorAuth.update({
            authenticatedFl: true,
            versionNo: models.sequelize.literal('versionNo + 1')
        },
            {
                where: {
                    accountFk: accountId,
                    secret: secret
                }
            });
    } catch (err) {
        console.log(err);
        await transaction.rollback();
        throw 'error with update of account secret';
    }
    await transaction.commit();

}

async function updateAccount(id, email, password, name, phoneNumber, accountTypeId, guestFl, deleteFl) {

    await models.account.update({
        email: email,
        name: name,
        password: utiltyHelper.generateHash(password),
        accountTypeFk: accountTypeId,
        createdDttm: Date.now(),
        phoneNumber: phoneNumber,
        guestFl: guestFl,
        deleteFl: deleteFl,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: id
        }
    });
}

async function deleteActiveCookieForAccount(accountId) {

    const cookie = await getActiveCookie(accountId);
    if (cookie != null) {
        await cookie.destroy();
    }
}

async function acceptCookie(cookieId) {
    await models.cookie.update({
        acceptedFl: true,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: cookieId
        }
    })
}

async function getAllNonGuestAccounts() {
    return await models.sequelize.query('select at.accountType, DATE_FORMAT(a.created_at, "%Y-%m-%d %H:%i:%s") as createdDt, a.* from accounts a ' +
        ' inner join accountTypes at on a.accountTypeFk = at.id ' +
        ' where a.guestFl is false ', { type: models.sequelize.QueryTypes.SELECT })
}

async function getTwoFactorAuthForAccountId(accountId) {
    return await models.twoFactorAuth.findOne({
        where: {
            accountFk: accountId,
            deleteFl: false
        }
    })
}

async function createTwoFactorAuthForAccountId(accountId, secret, qrCode) {
    return await models.twoFactorAuth.create({
        accountFk: accountId,
        secret: secret,
        qrCode: qrCode,
        authenticatedFl: false,
        deleteFl: false,
        versionNo: 1
    })
}

async function updateAccountNameAndPhoneNumber(accountId, name, phoneNumber) {
    return await models.account.update({
        name: name,
        phoneNumber: phoneNumber,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: accountId
        }
    })
}

async function updatePassword(accountId, password) {
    await models.account.update({
        password: utiltyHelper.generateHash(password),
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: accountId
        }
    })
}

async function deleteAccount(accountId) {
    await models.account.update({
        deleteFl: true,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: accountId
        }
    })
}

async function createForgottenPasswordRequest(accountId) {

    const token = utiltyHelper.generateNumberCode();

    const forgottenPassword = await getForgottenPasswordByToken(token);
    if(forgottenPassword == null) {
        return await models.forgottenPassword.create({
            accountFk: accountId,
            createdDttm: Date.now(),
            expirationDttm: utiltyHelper.dateXAmountFromNow(60*60*1000),
            usedFl: false,
            token: token,
            deleteFl: false,
            versionNo: 1
        })
    }

    return await createForgottenPasswordRequest(accountId);
}

async function getForgottenPassword(accountId, token) {
    const now = Date.now();
    return await models.forgottenPassword.findOne({
        where: {
            token: token,
            accountFk: accountId,
            deleteFl: false,
            usedFl: false,
            expirationDttm: {
                [Sequelize.Op.gt]: now,
            },
            createdDttm: {
                [Sequelize.Op.lt]: now
            }
        }
    })
}

async function updateForgottenPasswordAsUsed(forgettenPasswordId) {
    await models.forgottenPassword.update({
        usedFl: true,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
            where: {
                id: forgettenPasswordId
            }
    })
}

async function getForgottenPasswordByToken(token) {
    const now = Date.now();

    return await models.forgottenPassword.findOne({
        where: {
            token: token,
            deleteFl: false,
            usedFl: false,
            expirationDttm: {
                [Sequelize.Op.gt]: now,
            },
            createdDttm: {
                [Sequelize.Op.lt]: now
            }
        }
    })
}

async function getForgottenPasswordById(id) {
    const now = Date.now();
    return await models.forgottenPassword.findOne({
        where: {
            id: id,
            deleteFl: false,
            usedFl: false,
            expirationDttm: {
                [Sequelize.Op.gt]: now,
            },
            createdDttm: {
                [Sequelize.Op.lt]: now
            }
        }
    })
}

async function findForgottenPasswordById(id) {
    return await models.forgottenPassword.findOne({
        where: {
            id: id,
            deleteFl: false,
        }
    })
}

async function getNewCustomersInTheLastWeek() {
    const result = await models.sequelize.query('SELECT count(id) as count ' +
            ' FROM accounts ' +
            ' WHERE created_At >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK) ' +
            ' and accountTypeFk = :accountTypeId ', {replacements:{accountTypeId: 2}, type: models.sequelize.QueryTypes.SELECT});
    
    if(result.length == 0)
        return 0;
    
    return result[0].count;

}

module.exports = {
    updateAccount,
    complete2FaSetupForAccountId,
    findAccountById,
    findAccountByEmail,
    getNewAccountNumber,
    createCookie,
    getCookie,
    createGuestAccount,
    createAccount,
    getActiveCookie,
    deleteActiveCookieForAccount,
    acceptCookie,
    getAllNonGuestAccounts,
    getAccountById,
    getTwoFactorAuthForAccountId,
    createTwoFactorAuthForAccountId,
    updateAccountNameAndPhoneNumber,
    updatePassword,
    deleteAccount,
    createForgottenPasswordRequest,
    getForgottenPassword,
    getForgottenPasswordById,
    findForgottenPasswordById,
    updateForgottenPasswordAsUsed,
    getNewCustomersInTheLastWeek
}