const models = require('../../models');

async function createHomePageOptions() {
  return models.homePageOption.create({
    productTypeFk1: 1,
    description1: 'description',
    imagePath1: 'imagePath',
    deleteFl: false,
    versionNo: 1,
  });
}

async function deleteHomePageOptions() {
  return models.homePageOption.destroy({
    where: {
      id: 1,
    },
  });
}

module.exports = {
  createHomePageOptions,
  deleteHomePageOptions,
};
