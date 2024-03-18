const models = require('../../models');

async function createHomePageOption(productTypeFk, description, imagePath, orderNo, status) {
  return models.homePageDisplayOption.create({
    productTypeFk,
    description,
    imagePath,
    orderNo,
    status,
    deleteFl: false,
    versionNo: 1,
  });
}

async function setUpOptions(index) {
  if (index > 8) return;

  await createHomePageOption(null, null, null, index, 'Inactive');
  const newIndex = index + 1;
  // eslint-disable-next-line
  return setUpOptions(newIndex);
}

async function createHomePageOptions() {
  await createHomePageOption(1, 'description', 'imagePath', 1, 'Active');
  await setUpOptions(2);
}

async function deleteHomePageOptions() {
  return models.homePageDisplayOption.destroy({
    truncate: true,
  });
}

module.exports = {
  createHomePageOptions,
  deleteHomePageOptions,
};
