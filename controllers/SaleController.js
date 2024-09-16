const { isEmpty } = require('lodash');

const salesOperations = require('../utility/sales/salesOperations');
const { hasSaleNotChanged, validateDate, validateSale } = require('../validators/sale');
const companyInfo = require('../utility/company/companyInfo');
const { deleteSalesFromBasketItems, getBasketItemsWithSaleId } = require('../utility/basket/basketOperations');

async function getProductWithNoActiveSalesForSale(req, res) {
  const { id, fromDt, toDt } = req.params;
  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const currentProducts = await salesOperations.getProductsForSaleIdWhichOverlapDates(id, fromDt, toDt);
  const otherProducts = await salesOperations.getProductsWithNoActiveSale(fromDt, toDt);

  const result = [...currentProducts, ...otherProducts];
  return res.status(200).json(result);
}

async function getProductWithNoActiveSales(req, res) {
  const { fromDt, toDt } = req.params;

  const errors = validateDate(fromDt, toDt);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const products = await salesOperations.getProductsWithNoActiveSale(fromDt, toDt);

  return res.status(200).json(products);
}

async function createSale(req, res) {
  const errors = validateSale(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  const {
    name, fromDt, toDt, description, percentage, ids,
  } = req.body;
  const createdSale = await salesOperations.createSale(name, fromDt, toDt, description, percentage, ids);

  return res.status(200).json({ id: createdSale.id });
}

async function getSalePage(req, res) {
  const { id } = req.params;

  const sale = await salesOperations.getSaleById(id);
  if (!sale) {
    return res.redirect('/admin-dashboard');
  }

  return res.render('adminSale', {
    sale,
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

async function updateSale(req, res) {
  const { id } = req.params;

  const sale = await salesOperations.getSaleById(id);

  if (!sale) {
    return res.status(400).json({ error: 'No sale found' });
  }

  const errors = validateSale(req.body);

  if (!isEmpty(errors)) {
    return res.status(400).json(errors);
  }

  if (await hasSaleNotChanged(req.body, sale)) {
    return res.status(400).json({ errors: { noChange: true } });
  }

  const {
    name, fromDt, toDt, description, percentage, ids,
  } = req.body;
  const newSale = await salesOperations.updateSale(sale.id, name, fromDt, toDt, description, percentage, ids);

  return res.status(200).json({ id: newSale.id });
}

async function getSaleProducts(req, res) {
  const { id } = req.params;

  const saleProducts = await salesOperations.getSaleProductsForSaleId(id);
  const productIds = saleProducts.map((saleProduct) => saleProduct.productFk);
  return res.status(200).json({ productIds });
}

async function deleteSale(req, res) {
  const { id } = req.params;

  const basketItems = await getBasketItemsWithSaleId(id);
  if (basketItems.length === 0) {
    await salesOperations.deleteSaleById(id);
    return res.status(200).json({});
  }

  await deleteSalesFromBasketItems(id);

  await salesOperations.deactivateSale(id);

  return res.status(200).json({});
}

async function getSalesPage(req, res) {
  const sales = await salesOperations.getAllSales();
  res.render('adminSales', {
    user: req.user,
    companyDetails: companyInfo.getCompanyDetails(),
    sales,
  });
}

async function getAddSalePage(req, res) {
  // const products = await productOperations.getAllProducts();

  res.render('addSale', {
    user: req.user,
    // products,
    companyDetails: companyInfo.getCompanyDetails(),
  });
}

module.exports = {
  createSale,
  deleteSale,
  getAddSalePage,
  getProductWithNoActiveSalesForSale,
  getProductWithNoActiveSales,
  getSalePage,
  getSalesPage,
  getSaleProducts,
  updateSale,
};
