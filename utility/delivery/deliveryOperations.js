const Sequelize = require('sequelize');
const models = require('../../models');

async function getAllActiveDeliveryTypes() {
  return models.deliveryType.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function createDeliveryOptionForProduct(productId, deliveryOption) {
  return models.productDelivery.create({
    productFk: productId,
    deliveryTypeFk: deliveryOption.deliveryId,
    price: deliveryOption.price,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createDeliveryOptionsForProduct(productId, deliveryOptions) {
  deliveryOptions.forEach(async (deliveryOption) => {
    await createDeliveryOptionForProduct(productId, deliveryOption);
  });
}

async function getProductDeliveriesForProduct(productId) {
  return models.productDelivery.findAll({
    where: {
      deleteFl: false,
      productFk: productId,
    },
  });
}

async function updateProductDeliveryPriceForProductIdAndDeliveryType(price, deliveryTypeFk, productFk) {
  await models.productDelivery.update(
    {
      price,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        productFk,
        deliveryTypeFk,
      },
    },
  );
}

async function updateProductDeliveriesForProduct(productId, deliveryOptions) {
  // find all existing productDeliveries which are not part of the update
  // delete them

  const productDeliveries = await getProductDeliveriesForProduct(productId);

  const productDeliveriesToDelete = productDeliveries.filter(
    (pd) => !deliveryOptions.map((d) => d.deliveryId).includes(pd.deliveryTypeFk.toString()),
  );

  await Promise.all(
    productDeliveriesToDelete.map(async (productDelivery) => {
      await productDelivery.destroy();
    }),
  );

  // find productDeliveries with the same id

  const deliveriesToBeUpdated = deliveryOptions.filter((d) => productDeliveries.map((pd) => pd.deliveryTypeFk.toString())
    .includes(d.deliveryId));

  await Promise.all(
    deliveriesToBeUpdated.map(async (deliveryOption) => {
      await updateProductDeliveryPriceForProductIdAndDeliveryType(
        deliveryOption.price,
        deliveryOption.deliveryId,
        productId,
      );
    }),
  );

  const deliveriesToBeCreated = deliveryOptions.filter(
    (d) => !productDeliveries.map((pd) => pd.deliveryTypeFk.toString()).includes(d.deliveryId),
  );

  await Promise.all(
    deliveriesToBeCreated.map(async (deliveryOption) => {
      await createDeliveryOptionForProduct(productId, deliveryOption);
    }),
  );
}

async function getDeliveryType(id) {
  return models.deliveryType.findOne({
    where: {
      id,
    },
  });
}
// TODO - needs relook - not convinced logic is right
async function getDeliveryOptionsForProducts(productIds) {
  const deliveryOptions = {};
  const productDeliveryMap = new Map();
  let productDeliveries;

  for (let i = 0; i < productIds.length; i += 1) {
    const productId = productIds[i];
    // eslint-disable-next-line no-await-in-loop
    productDeliveries = await getProductDeliveriesForProduct(productId);

    productDeliveries.forEach((pd) => {
      const currentPrice = productDeliveryMap.get(pd.deliveryTypeFk);
      if (currentPrice === null || currentPrice === undefined) {
        productDeliveryMap.set(pd.deliveryTypeFk, pd.price);
      } else if (pd.price > currentPrice) {
        productDeliveryMap.set(pd.deliveryTypeFk, pd.price);
      }
    });
    deliveryOptions[productId] = productDeliveries.map((pd) => pd.deliveryTypeFk);
  }

  let availableOptions = [];

  if (productIds.length > 0) {
    availableOptions = deliveryOptions[productIds[0]].slice();

    for (let j = 1; j < productIds.length; j += 1) {
      availableOptions = availableOptions.filter((option) => deliveryOptions[productIds[j]].includes(option));
    }
  }

  if (availableOptions.length === 0) {
    const maxArray = [];

    productDeliveries.forEach((pd) => {
      if (maxArray.length === 0) {
        maxArray.push(pd);
      }

      if (pd.price > maxArray[0].price) {
        maxArray.splice(0, 1);
        maxArray.push(pd);
      }
    });

    return maxArray;
  }
  const deliveryTypes = await models.deliveryType.findAll({
    where: {
      id: {
        [Sequelize.Op.in]: availableOptions,
      },
    },
    order: [['id', 'ASC']],
  });

  return deliveryTypes.map((deliveryType) => {
    const values = deliveryType.dataValues;
    return { ...values, price: productDeliveryMap.get(deliveryType.id) };
  });
}

async function getAllDeliveryOptionsForProduct(productFk) {
  return models.productDelivery.findAll({
    where: {
      productFk,
      deleteFl: false,
    },
  });
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
  createDeliveryOptionForProduct,
  getAllActiveDeliveryTypes,
  createDeliveryOptionsForProduct,
  getProductDeliveriesForProduct,
  updateProductDeliveriesForProduct,
  getDeliveryType,
  getDeliveryOptionsForProducts,
  createShippingDetail,
  getShippingDetailById,
  getAllDeliveryOptionsForProduct,
  updateProductDeliveryPriceForProductIdAndDeliveryType,
};
