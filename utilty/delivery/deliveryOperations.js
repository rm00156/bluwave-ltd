const models = require('../../models');
const Sequelize = require('sequelize');
const { max } = require('lodash');

async function getAllActiveDeliveryTypes() {

    return await models.deliveryType.findAll({
        where: { 
            deleteFl: false
        }
    });
}

async function createDeliveryOptionsForProduct(productId, deliveryOptions) {

    deliveryOptions.forEach(async deliveryOption => {

        await createDeliveryOptionForProduct(productId, deliveryOption);
    });
}

async function createDeliveryOptionForProduct(productId, deliveryOption) {
    return await models.productDelivery.create({
        productFk: productId,
        deliveryTypeFk: deliveryOption.deliveryId,
        price: deliveryOption.price,
        deleteFl: false,
        versionNo: 1
    });
}

async function getProductDeliveriesForProduct(productId) {

    return await models.productDelivery.findAll({
        where: {
            deleteFl: false,
            productFk: productId
        }
    })
}

async function updateProductDeliveriesForProduct(productId, deliveryOptions) {

    // find all existing productDeliveries which are not part of the update
    // delete them

    const productDeliveries = await models.productDelivery.findAll({
        where: {
            productFk: productId,
            deleteFl: false
        }
    });

    const productDeliveriesToDelete = productDeliveries.filter(pd => !deliveryOptions.map(d => d.deliveryId).includes(pd.deliveryTypeFk.toString()));

    productDeliveriesToDelete.forEach(async productDelivery => {
        await productDelivery.destroy();
    });

    // find productDeliveries with the same id

    const deliveriesToBeUpdated = deliveryOptions.filter(d => productDeliveries.map(pd => pd.deliveryTypeFk.toString()).includes(d.deliveryId));

    deliveriesToBeUpdated.forEach(async deliveryOption => {

        await models.productDelivery.update({
            price: deliveryOption.price,
            versionNo: models.sequelize.literal('versionNo + 1')
        }, {
            where: {
                productFk: productId,
                deliveryTypeFk: deliveryOption.deliveryId
            }
        });
    });

    const deliveriesToBeCreated = deliveryOptions.filter(d => !productDeliveries.map(pd => pd.deliveryTypeFk.toString()).includes(d.deliveryId));

    deliveriesToBeCreated.forEach(async deliveryOption => {
        await createDeliveryOptionForProduct(productId, deliveryOption);
    })
}

async function getDeliveryType(id) {
    return await models.deliveryType.findOne({
        where: {
            id: id
        }
    })
}

async function getDeliveryOptionsForProducts(productIds) {
    const deliveryOptions = {};
    const productDeliveryMap = new Map();
    var productDeliveries;
    for(var i = 0; i < productIds.length; i++){ 
        const productId = productIds[i];
        productDeliveries = await models.productDelivery.findAll({
            where: {
                productFk: productId,
                deleteFl: false
            }
        });

        productDeliveries.forEach(pd => {
            const currentPrice = productDeliveryMap.get(pd.deliveryTypeFk);
            if(currentPrice == null || currentPrice == undefined) {
                productDeliveryMap.set(pd.deliveryTypeFk, pd.price);
            } else {
                if(pd.price > currentPrice) {
                    productDeliveryMap.set(pd.deliveryTypeFk, pd.price);
                }
            }
        });
        deliveryOptions[productId] = productDeliveries.map(pd => pd.deliveryTypeFk);
    }

    var availableOptions = [];

    if (productIds.length > 0) {
        availableOptions = deliveryOptions[productIds[0]].slice();

        for (var i = 1; i < productIds.length; i++) {
            availableOptions = availableOptions.filter(function (option) {
                return deliveryOptions[productIds[i]].includes(option);
            });
        }
    }

    if(availableOptions.length == 0) {
        
        const maxArray = [];

        productDeliveries.forEach(pd => {
            if(maxArray.length == 0) {
                maxArray.push(pd);
            };

            if(pd.price > maxArray[0].price) {
                maxArray.splice(0,1);
                maxArray.push(pd);
            }
        })

        return maxArray;
        
    } else {
        const deliveryTypes = await models.deliveryType.findAll({
            where: {
                id:{
                    [Sequelize.Op.in] : availableOptions
                }
            },
            order: [['id', 'ASC']]
        }); 

        deliveryTypes.forEach(deliveryType => {
            deliveryType['price'] = productDeliveryMap.get(deliveryType.id);
        });

        return deliveryTypes;
    }    
}

async function createShippingDetail(accountId, fullName, email, addressLine1, addressLine2, city, postCode, phoneNumber,
    primaryFl, savedFl) {

    return await models.shippingDetail.create({
        accountFk: accountId,
        fullName: fullName,
        email: email,
        addressLine1: addressLine1,
        addressLine2: addressLine2 == '' ? null : addressLine2,
        city: city,
        postCode: postCode,
        phoneNumber: phoneNumber,
        primaryFl: primaryFl,
        savedFl: savedFl,
        deleteFl: false,
        versionNo: 1
    })
}

async function getShippingDetailById(id) {
    return await models.shippingDetail.findOne({
        where: {
            id: id
        }
    });
}

module.exports = {
    getAllActiveDeliveryTypes,
    createDeliveryOptionsForProduct,
    getProductDeliveriesForProduct,
    updateProductDeliveriesForProduct,
    getDeliveryType,
    getDeliveryOptionsForProducts,
    createShippingDetail,
    getShippingDetailById
}