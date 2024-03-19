const models = require('../../models');
const productOperations = require('../products/productOperations');

async function getHomePageOptionById(id) {
  return models.homePageDisplayOption.findOne({
    where: {
      id,
    },
  });
}

async function updateHomePageOption(id, data, active) {
  const updateData = { ...data };
  updateData.deleteFl = false;
  updateData.versionNo = models.sequelize.literal('versionNo + 1');
  updateData.status = active ? 'Active' : 'Inactive';

  await models.homePageDisplayOption.update(updateData, {
    where: {
      id,
    },
  });
}

function populateProductTypeMap(productTypes) {
  const result = new Map();
  productTypes.map((p) => result.set(p.id, p.productType));

  return result;
}

async function getHomePageOptions() {
  return models.homePageDisplayOption.findAll({
    where: {
      deleteFl: false,
    },
    order: [['orderNo', 'ASC']],
  });
}

async function getHomePageOptionDetails() {
  const productTypes = await productOperations.getAllActiveProductTypes();

  const productTypeMap = populateProductTypeMap(productTypes);
  const homePageOptions = await getHomePageOptions();
  const result = [];
  homePageOptions.forEach((h) => {
    const newHomePageOption = { ...h.dataValues };
    if (productTypeMap.get(h.productTypeFk) !== null) newHomePageOption.productType = productTypeMap.get(h.productTypeFk);

    result.push(newHomePageOption);
  });

  return result;
}

async function getAllAvailableActiveProductTypes(productTypeId) {
  const productType = await productOperations.getProductTypeById(productTypeId);

  const homePageOptions = await getHomePageOptions();
  const homePageOptionProductTypeIds = homePageOptions.filter((h) => h.productTypeFk).map((m) => m.productTypeFk);

  const availableProductTypes = await productOperations.getAllProductTypesNotInList(homePageOptionProductTypeIds);
  return [productType, ...availableProductTypes];
}

async function getHomePageOptionByProductTypeId(productTypeFk) {
  return models.homePageDisplayOption.findOne({
    where: {
      deleteFl: false,
      productTypeFk,
    },
  });
}

module.exports = {
  getAllAvailableActiveProductTypes,
  getHomePageOptionById,
  getHomePageOptionByProductTypeId,
  getHomePageOptionDetails,
  getHomePageOptions,
  updateHomePageOption,
};
