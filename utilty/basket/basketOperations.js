const models = require('../../models');
const Sequelize = require('sequelize');
const productOperations = require('../products/productOperations');
const {Upload} = require("@aws-sdk/lib-storage");
const {S3Client} = require("@aws-sdk/client-s3");


async function getActiveBasketItemsForAccount(accountId) {

    const basketItems = await models.sequelize.query(' select b.*, b.price, p.name, p.image1Path, q.quantity from basketItems b ' +
        ' inner join products p on b.productFk = p.id ' +
        ' inner join quantities q on b.quantityFk = q.id ' +
        ' where b.accountFk = :accountId ' +
        ' and (b.purchaseBasketFk is null or b.purchaseBasketFk = (select id from purchaseBaskets where id = b.purchaseBasketFk and status != :completed )) ' +
        ' and b.deleteFl = false ' +
        ' and p.deleteFl = false', { replacements: { accountId: accountId, completed: 'Completed' }, type: models.sequelize.QueryTypes.SELECT });

    var totalCost = 0;
    var revisedBasketItems = []
    for (var i = 0; i < basketItems.length; i++) {
        var basketItem = basketItems[i];
        totalCost = totalCost + parseFloat(basketItem.price);

        const option = await productOperations.getOptionGroupItemsForOptionGroup(basketItem.optionGroupFk);
        const quantities = await productOperations.getQuantitiesForProduct(basketItem.productFk);
        if (basketItem.fileGroupFk != null) {
            const fileGroupItems = await getFileGroupItemByFileGroupId(basketItem.fileGroupFk);
            basketItem['fileGroupItems'] = fileGroupItems;
        }
        basketItem['options'] = option;
        basketItem['quantities'] = quantities;
        revisedBasketItems.push(basketItem);

    }
    return { basketItems: revisedBasketItems, totalCost: totalCost.toFixed(2) };
}

async function createBasketItem(accountId, productId, optionGroupId, quantityId, price) {
    return await models.basketItem.create({
        accountFk: accountId,
        productFk: productId,
        optionGroupFk: optionGroupId,
        quantityFk: quantityId,
        price: price,
        deleteFl: false,
        versionNo: 1
    })
}

async function getPurchaseBasketById(id) {
    return await models.purchaseBasket.findOne({
        where: {
            id: id
        }
    })
}

async function getFileGroupById(id) {
    return await models.fileGroup.findOne({
        where: {
            id: id
        }
    })
}

async function getFileGroupItemByFileGroupId(id) {
    return await models.fileGroupItem.findAll({
        where: {
            fileGroupFk: id
        }
    })
}

async function getBasketItem(id) {
    return await models.basketItem.findOne({
        where: {
            id: id
        }
    })
}

async function removeBasketItem(basketItemId) {

    const basketItem = await getBasketItem(basketItemId);
    const purchaseBasketId = basketItem.purchaseBasketFk;
    const fileGroupId = basketItem.fileGroupFk;
    const optionGroupId = basketItem.optionGroupFk;

    await basketItem.destroy();
    if (purchaseBasketId != null) {
        const purchaseBasket = await getPurchaseBasketById(purchaseBasketId);
        await purchaseBasket.destroy();
    }

    if (fileGroupId != null) {
        const fileGroup = await getFileGroupById(fileGroupId);
        const fileGroupItems = await getFileGroupItemByFileGroupId(fileGroup.id);

        fileGroupItems.forEach(async fileGroupItem => {
            await fileGroupItem.destroy();
        });

        await fileGroup.destroy();
    }

    const optionGroup = await productOperations.getOptionGroupById(optionGroupId);
    const optionGroupItems = await productOperations.getOptionGroupItemsByOptionGroupId(optionGroupId)

    optionGroupItems.forEach(async optionGroupItem => {
        await optionGroupItem.destroy();
    });

    await optionGroup.destroy();
}

async function updateQuantityPriceForBasketItem(basketItemId, quantityId) {

    const basketItem = await getBasketItem(basketItemId);

    var optionGroupIdForProductPriceRow = await models.sequelize.query('SELECT og.id FROM optionGroups og ' +
        ' INNER JOIN optionGroupItems ogi ON og.id = ogi.optionGroupFk ' +
        ' inner join priceMatrixRows pmr on pmr.optionGroupFk = og.id ' +
        ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id ' +
        ' WHERE ogi.optionFk IN ( ' +
        ' SELECT ogi1.optionFk ' +
        ' FROM optionGroupItems ogi1 ' +
        ' WHERE ogi1.optionGroupFk = :optionGroupId ' +
        ' ) ' +
        ' and og.id <> :optionGroupId ' +
        ' and pm.productFk = :productId ' +
        ' and pm.deleteFl = false ' +
        ' GROUP BY og.id ' +
        ' HAVING COUNT(DISTINCT ogi.optionFk) = ( ' +
        '     SELECT COUNT(DISTINCT ogi2.optionFk) ' +
        '     FROM optionGroupItems ogi2 ' +
        '     WHERE ogi2.optionGroupFk = :optionGroupId ' +
        ' )', {
            replacements: { optionGroupId: basketItem.optionGroupFk, productId: basketItem.productFk },
        type: models.sequelize.QueryTypes.SELECT
    });
    optionGroupIdForProductPriceRow = optionGroupIdForProductPriceRow[0].id;

    const priceMatrixRowQuantityPrices = await models.sequelize.query('select pq.* from priceMatrixRowQuantityPrices pq ' +
        ' inner join priceMatrixRows pr on pq.priceMatrixRowFk = pr.id ' +
        ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id ' +
        ' where pr.optionGroupFk = :optionGroupId ' +
        ' and pq.quantityFk = :quantityId ' +
        ' and pm.deleteFl = false ', {
            replacements: {
                optionGroupId: optionGroupIdForProductPriceRow,
                quantityId: quantityId
            }, type: models.sequelize.QueryTypes.SELECT
    });

    const priceMatrixRowQuantityPrice = priceMatrixRowQuantityPrices[0];

    await models.basketItem.update({
        quantityFk: quantityId,
        price: priceMatrixRowQuantityPrice.price,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: basketItemId
        }
    });

}

async function createFileGroup() {
    return await models.fileGroup.create({
        deleteFl: false,
        versionNo: 1
    })
}

async function createFileGroupItem(fileGroupId, path, fileName) {
    return await models.fileGroupItem.create({
        fileGroupFk: fileGroupId,
        path: path,
        fileName: fileName,
        deleteFl: false,
        versionNo: 1
    });
}

async function uploadDesignForBasketItem(file, basketItemId) {

    const s3 = new S3Client({
        region: process.env.S3_REGION,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
        endpoint: 'https://s3.eu-west-2.amazonaws.com',
        
    });
    const date = Date.now();


    var s3Path = process.env.S3_BUCKET_PATH + '/BasketItem/' + date + '_' + encodeURIComponent(file.name);
    var params = {
        Bucket: process.env.S3_BUCKET,
        Body: file.data,
        Key: 'BasketItem/' + date + '_' + file.name,
        ACL: 'public-read'
    };

    const s3UploadPromise = new Upload({
        client: s3,
        params
    }).done();
    await s3UploadPromise;

    const basketItem = await getBasketItem(basketItemId);
    var fileGroupFk = basketItem.fileGroupFk;
    if (fileGroupFk == null) {
        const fileGroup = await createFileGroup();
        fileGroupFk = fileGroup.id;
        await models.basketItem.update({
            fileGroupFk: fileGroupFk,
            versionNo: models.sequelize.literal('versionNo + 1')
        }, {
            where: {
                id: basketItemId
            }
        })
    }

    await createFileGroupItem(fileGroupFk, s3Path, file.name);
}

async function getFileGroupItemsForBasketItem(basketItem) {

    const fileGroupFk = basketItem.fileGroupFk;

    if (fileGroupFk == null)
        return [];

    return await models.fileGroupItem.findAll({
        where: {
            fileGroupFk: fileGroupFk
        }
    });
}

async function removeFileGroupItem(fileGroupItemId, basketItemId) {

    const fileGroupItem = await models.fileGroupItem.findOne({
        where: {
            id: fileGroupItemId
        }
    });

    const fileGroupId = fileGroupItem.fileGroupFk;
    await fileGroupItem.destroy();

    const fileGroupItems = await getFileGroupItemByFileGroupId(fileGroupId);

    if (fileGroupItems.length == 0) {
        await models.basketItem.update({
            fileGroupFk: null,
            versionNo: models.sequelize.literal('versionNo + 1')
        }, {
            where: {
                id: basketItemId
            }
        })
    }
}

async function updateBasketItemsToAccount(accountId, basketItemIds) {
    await models.basketItem.update({
        accountFk: accountId
    },
        {
            where: {
                id: { [Sequelize.Op.in]: basketItemIds }
            }
        }
    )
}

async function getAllBasketItemsForCheckout(accountId) {

    const getActiveBasketItemsDetails = await getActiveBasketItemsForAccount(accountId);
    const basketItems = getActiveBasketItemsDetails.basketItems;

    const basketItemsForCheckout = basketItems.filter(b => b.fileGroupFk != null);

    return basketItemsForCheckout
}

function getSubtotalFromBasketItems(basketItems) {
    var subtotal = 0;

    basketItems.forEach(b => {
        subtotal = subtotal + parseFloat(b.price);
    });

    return subtotal.toFixed(2);
}



async function setPurchaseBasketForBasketItem(basketItemId, purchaseBasketId) {

    await models.basketItem.update({
        purchaseBasketFk: purchaseBasketId,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: basketItemId
        }
    })
}

async function getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId) {
    const result = await models.sequelize.query('select b.*, p.name as productName, q.quantity, ot.optionType, o.name as optionName from basketItems b ' +
        ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id ' +
        ' inner join products p on b.productFk = p.id ' +
        ' inner join optionGroupItems ogi on ogi.optionGroupFk = b.optionGroupFk ' +
        ' inner join options o on ogi.optionFk = o.id ' +
        ' inner join optionTypes ot on o.optionTypeFk = ot.id ' +
        ' inner join quantities q on b.quantityFk = q.id ' +
        ' where pb.id = :purchaseBasketId ', {
            replacements: { purchaseBasketId: purchaseBasketId },
        type: models.sequelize.QueryTypes.SELECT
    });

    const basketItems = [];
    for (var i = 0; i < result.length; i++) {
        var basketItem = result[i];

        const option = await productOperations.getOptionGroupItemsForOptionGroup(basketItem.optionGroupFk);
        if (basketItem.fileGroupFk != null) {
            const fileGroupItems = await getFileGroupItemByFileGroupId(basketItem.fileGroupFk);
            basketItem['fileGroupItems'] = fileGroupItems;
        }
        basketItem['options'] = option;
        basketItems.push(basketItem);
    }

    const revisedBasketItems = basketItems.filter((item, index, self) => {
        return self.findIndex((i) => i.id === item.id) === index;
    });

    return revisedBasketItems;

}

module.exports = {
    getActiveBasketItemsForAccount,
    createBasketItem,
    removeBasketItem,
    getPurchaseBasketById,
    getBasketItem,
    updateQuantityPriceForBasketItem,
    uploadDesignForBasketItem,
    getFileGroupItemsForBasketItem,
    removeFileGroupItem,
    updateBasketItemsToAccount,
    getAllBasketItemsForCheckout,
    getSubtotalFromBasketItems,
    setPurchaseBasketForBasketItem,
    getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId,
}