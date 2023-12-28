const models = require('../../models');

async function createPurchaseBasket(accountId, fullName, email, phoneNumber, subtotal, total, shippingDetail, deliveryTypeId, deliveryPrice) {

    return models.purchaseBasket.create({
        accountFk: accountId,
        fullName: fullName,
        email: email,
        phoneNumber: phoneNumber,
        createdDttm: Date.now(),
        status: 'Pending',
        subTotal: subtotal,
        total: total,
        shippingDetailFk: shippingDetail == null ? null : shippingDetail.id,
        deliveryTypeFk: deliveryTypeId,
        deliveryPrice: deliveryPrice,
        deleteFl: false,
        versionNo: 1

    })
}

async function completePurchaseBasket(id, dttm) {

    await models.purchaseBasket.update({
        status: 'Completed',
        orderNumber: 'blu-' + id,
        purchaseDttm: dttm,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: id
        }
    });
}

async function getPurchaseBasketWithIdAndAccountId(id, accountId) {
    return await models.purchaseBasket.findOne({
        where: {
            id: id,
            accountFk: accountId
        }
    })
}

async function getSuccessfulOrdersForAccountId(accountId) {
    return await models.sequelize.query('select pb.*, dt.name as deliveryType, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDt from purchaseBaskets pb ' +
        ' inner join deliveryTypes dt on pb.deliveryTypeFk = dt.id ' +
        ' where pb.status = :completed ' +
        ' and pb.accountFk = :accountId ' +
        ' and pb.deleteFl = false ', {
            replacements: { completed: 'Completed', accountId: accountId },
        type: models.sequelize.QueryTypes.SELECT
    });
}

async function getSuccessfulOrderForAccountIdAndPurchaseBasketId(purchaseBasketId) {
    const result = await models.sequelize.query('select pb.*, dt.name as deliveryType, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDt from purchaseBaskets pb ' +
        ' inner join deliveryTypes dt on pb.deliveryTypeFk = dt.id ' +
        ' where pb.status = :completed ' +
        ' and pb.id = :purchaseBasketId ' +
        ' and pb.deleteFl = false ', {
            replacements: { completed: 'Completed', purchaseBasketId: purchaseBasketId },
        type: models.sequelize.QueryTypes.SELECT
    });
    if (result.length == 0)
        return null;
    else
        return result[0];
}

async function getAllCompletedOrders() {

    return await models.sequelize.query('select pb.*, DATE_FORMAT(pb.purchaseDttm, "%Y-%m-%d %H:%i:%s") as purchaseDt, dt.name as deliveryType, a.guestFl from purchaseBaskets pb ' +
        ' inner join deliveryTypes dt on pb.deliveryTypeFk = dt.id ' +
        ' inner join accounts a on pb.accountFk = a.id ' +
        ' where pb.deleteFl = false ' +
        ' and pb.status = :completed ',
        { replacements: { completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });
}

async function updatePurchaseBasketWithOrderId(purchaseBasketId, orderId) {
    await models.purchaseBasket.update({
        orderId: orderId,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: purchaseBasketId
        }
    })
}

async function getOrderDetailsInLastMonth() {

    const result = await models.sequelize.query('SELECT sum(total) as total, count(id) as count ' +
        ' FROM purchaseBaskets ' +
        ' WHERE purchaseDttm >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) ' +
        ' and status = :status ', { replacements: { status: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

        return result[0];
}

module.exports = {
    createPurchaseBasket,
    completePurchaseBasket,
    getPurchaseBasketWithIdAndAccountId,
    getSuccessfulOrdersForAccountId,
    getSuccessfulOrderForAccountIdAndPurchaseBasketId,
    getAllCompletedOrders,
    updatePurchaseBasketWithOrderId,
    getOrderDetailsInLastMonth
}