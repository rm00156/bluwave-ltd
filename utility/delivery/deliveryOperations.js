const Sequelize = require('sequelize');
const models = require('../../models');
const { getBusinessDay } = require('../general/utilityHelper');

async function getDeliveryOptionsForProductIds(ids) {
  const productDeliveries = await models.productDelivery.findAll({
    where: {
      productFk: {
        [Sequelize.Op.in]: ids,
      },
    },
  });

  if (productDeliveries.length === 0) return null;

  let collectionWorkingDays = 0;
  let standardPrice = 0;
  let standardWorkingDays = 0;
  let expressPrice = 0;
  let expressWorkingDays = 0;

  productDeliveries.forEach((productDelivery) => {
    if (productDelivery.collectionWorkingDays > collectionWorkingDays) {
      collectionWorkingDays = productDelivery.collectionWorkingDays;
    }

    if (parseFloat(productDelivery.standardPrice) > standardPrice) {
      standardPrice = parseFloat(productDelivery.standardPrice);
    }

    if (productDelivery.standardWorkingDays > standardWorkingDays) {
      standardWorkingDays = productDelivery.standardWorkingDays;
    }

    if (parseFloat(productDelivery.expressPrice) > expressPrice) {
      expressPrice = parseFloat(productDelivery.expressPrice);
    }

    if (productDelivery.expressWorkingDays > expressWorkingDays) {
      expressWorkingDays = productDelivery.expressWorkingDays;
    }
  });

  return {
    collectionWorkingDays,
    collectionDate: await getBusinessDay(new Date(), collectionWorkingDays),
    standardPrice: standardPrice.toFixed(2),
    standardWorkingDays,
    standardDate: await getBusinessDay(new Date(), standardWorkingDays),
    expressPrice: expressPrice.toFixed(2),
    expressDate: await getBusinessDay(new Date(), expressWorkingDays),
    expressWorkingDays,
  };
}

async function createShippingDetail(
  accountId,
  fullName,
  email,
  addressLine1,
  addressLine2,
  city,
  postCode,
  phoneNumber,
  primaryFl,
  savedFl,
) {
  return models.shippingDetail.create({
    accountFk: accountId,
    fullName,
    email,
    addressLine1,
    addressLine2: addressLine2 === '' ? null : addressLine2,
    city,
    postCode,
    phoneNumber,
    primaryFl,
    savedFl,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getShippingDetailById(id) {
  return models.shippingDetail.findOne({
    where: {
      id,
    },
  });
}

module.exports = {
  getDeliveryOptionsForProductIds,
  createShippingDetail,
  getShippingDetailById,
};
