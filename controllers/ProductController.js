const companyInfo = require('../utility/company/companyInfo');

const {
  getProductById,
  getPriceMatrixForProductId,
  getQuantityGroupForProductId,
  getFinishingMatricesForProductId,
  getProductDeliveryByProductId,
  isProductValid,
} = require('../utility/products/productOperations');

async function getProductPage5(req, res) {
  const { id } = req.params;
  const product = await getProductById(id);

  if (product === null) {
    // message
    return res.redirect('/admin-dashboard/products');
  }

  const priceMatrix = await getPriceMatrixForProductId(product.id);
  const quantityGroup = await getQuantityGroupForProductId(product.id);
  const finishingMatrices = await getFinishingMatricesForProductId(product.id);
  const productDelivery = await getProductDeliveryByProductId(product.id);
  const isValid = await isProductValid(product);

  const { message } = req.session;
  req.session.message = undefined;
  return res.render('productPage5', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    product,
    quantityGroup,
    priceMatrix,
    finishingMatrices,
    productDelivery,
    isValid: isValid.isValid,
    message,
  });
}

module.exports = {
  getProductPage5,
};
