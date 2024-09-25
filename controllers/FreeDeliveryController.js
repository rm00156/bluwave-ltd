const { isEmpty } = require('lodash');

const companyInfo = require('../utility/company/companyInfo');
const { validateSpendOver } = require('../validators/delivery');
const {
  createFreeDelivery,
  getFreeDelivery,
  deleteFreeDelivery,
  updateFreeDelivery,
} = require('../utility/delivery/deliveryOperations');

async function getFreeDeliveryPage(req, res) {
  const freeDelivery = await getFreeDelivery();
  res.render('adminFreeDelivery', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    freeDelivery,
  });
}

async function setFreeDelivery(req, res) {
  const { status, spendOver } = req.body;

  if (status === 'false') {
    await deleteFreeDelivery();
    return res.status(200).json({});
  }

  const errors = validateSpendOver(spendOver);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const freeDelivery = await getFreeDelivery();

  if (freeDelivery) {
    await updateFreeDelivery(freeDelivery.id, spendOver);
  } else {
    await createFreeDelivery(spendOver);
  }

  return res.status(200).json({});
}

module.exports = {
  getFreeDeliveryPage,
  setFreeDelivery,
};
