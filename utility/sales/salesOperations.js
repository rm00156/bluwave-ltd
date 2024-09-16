const models = require('../../models');
const { midnightDate, startOfDay } = require('../general/utilityHelper');

async function getProductsWithNoActiveSale(fromDtString, toDtString) {
  const fromDt = new Date(fromDtString);
  const toDt = midnightDate(toDtString);

  return models.sequelize.query(
    ' select distinct p.*, pt.productType from products p inner join productTypes pt on p.productTypeFk = pt.id where p.id not in (select sp.productFk from saleProducts sp '
      + ' inner join sales s on sp.saleFk = s.id '
      + ' where s.fromDt <= :toDt and :fromDt <= s.toDt '
      + ' and s.deleteFl = false) ',
    { replacements: { fromDt, toDt }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getSaleProductsForSaleId(saleFk) {
  return models.saleProduct.findAll({
    where: {
      deleteFl: false,
      saleFk,
    },
  });
}

async function setSaleForBasketItems(currentSaleFk, saleFk, productIds, percentage) {
  const ids = JSON.parse(productIds);

  const currentSaleProducts = await getSaleProductsForSaleId(currentSaleFk);
  const currentSaleProductIds = currentSaleProducts.map((item) => item.productFk.toString());

  const removedIds = [];
  currentSaleProductIds.forEach((id) => {
    if (!ids.includes(id)) {
      removedIds.push(id);
    }
  });

  if (removedIds.length > 0) {
    await models.sequelize.query(
      ' update basketItems bi '
        + ' LEFT JOIN sales s on bi.saleFk = s.id '
        + ' LEFT JOIN promoCodes pc on bi.promoCodeFk = pc.id '
        + ' LEFT JOIN purchaseBaskets pb on bi.purchaseBasketFk = pb.id '
        + ' set bi.subTotal = bi.price * coalesce((1 - pc.percentage /100), 1), '
        + ' bi.saleFk = null, bi.versionNo = bi.versionNo + 1 where bi.productFk in (:removedIds) '
        + ' and (bi.purchaseBasketFk is null or pb.status != :status) and bi.deleteFl = false ',
      { replacements: { removedIds, status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
    );
  }

  if (ids.length === 0) return false;

  await models.sequelize.query(
    ' update basketItems bi '
      + ' LEFT JOIN sales s on bi.saleFk = s.id'
      + ' LEFT JOIN promoCodes pc on bi.promoCodeFk = pc.id '
      + ' LEFT JOIN purchaseBaskets pb on bi.purchaseBasketFk = pb.id '
      + ' set bi.subTotal = bi.price * coalesce((1 - :percentage /100), 1) * coalesce((1 - pc.percentage /100), 1), '
      + ' bi.saleFk = :saleFk, '
      + ' bi.versionNo = bi.versionNo + 1 where bi.productFk in (:ids) '
      + ' and (bi.purchaseBasketFk is null or pb.status != :status) and bi.deleteFl = false ',
    {
      replacements: {
        percentage,
        saleFk,
        ids,
        status: 'Completed',
      },
      type: models.sequelize.QueryTypes.UPDATE,
    },
  );

  return true;
}

async function createSaleProducts(saleFk, ids) {
  if (ids.length === 0) return null;

  let query = 'insert into saleProducts (saleFk, productFk, deleteFl, versionNo) values ';

  ids.forEach((id) => {
    query += `(${saleFk}, ${id}, false, 1),`;
  });

  query = query.substring(0, query.length - 1);

  return models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function createSale(name, fromDt, toDt, description, percentage, ids) {
  const fromDttm = startOfDay(fromDt);
  const toDttm = midnightDate(toDt);
  const sale = await models.sale.create({
    name,
    fromDt: fromDttm,
    toDt: toDttm,
    description,
    percentage,
    usedCount: 0,
    deleteFl: false,
    versionNo: 1,
  });

  const productIds = JSON.parse(ids);
  await createSaleProducts(sale.id, productIds);

  return sale;
}

async function getSaleById(id) {
  const sales = await models.sequelize.query(
    'select *, DATE_FORMAT(fromDt, "%Y-%m-%d") as fromDt, DATE_FORMAT(toDt, "%Y-%m-%d") as toDt from sales where id = :id ',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );

  return sales.length > 0 ? sales[0] : null;
}

async function getProductsForSaleId(saleFk) {
  return models.sequelize.query(
    'select p.*, pt.productType from products p inner join saleProducts sp on sp.productFk = p.id '
      + ' inner join productTypes pt on p.productTypeFk = pt.id '
      + ' where sp.saleFk = :saleFk ',
    { replacements: { saleFk }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getProductsForSaleIdWhichOverlapDates(saleFk, fromDtString, toDtString) {
  const fromDt = new Date(fromDtString);
  const toDt = midnightDate(toDtString);
  return models.sequelize.query(
    'select p.*, pt.productType from products p '
      + ' inner join saleProducts sp on sp.productFk = p.id '
      + ' inner join sales s on sp.saleFk = s.id '
      + ' inner join productTypes pt on p.productTypeFk = pt.id '
      + ' where s.deleteFl = false and s.id = :saleFk and '
      + ' s.fromDt <= :toDt '
      + ' and s.toDt >= :fromDt ',
    { replacements: { saleFk, fromDt, toDt }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function updateSale(id, name, fromDt, toDt, description, percentage, productIds) {
  const currentDate = midnightDate(toDt);
  await models.sale.update(
    {
      name,
      fromDt,
      toDt: currentDate,
      description,
      percentage,
      versionNo: models.sequelize.literal('versionNo + 1'),
      deleteFl: true,
    },
    {
      where: {
        id,
        deleteFl: false,
      },
    },
  );

  const sale = await createSale(name, fromDt, toDt, description, percentage, productIds);

  await setSaleForBasketItems(id, sale.id, productIds, percentage);
  return sale;
}

async function deleteSaleById(id) {
  await models.sequelize.query('delete from saleProducts where saleFk = :id', {
    replacements: { id },
    type: models.sequelize.QueryTypes.DELETE,
  });
  await models.sequelize.query('delete from sales where id = :id', {
    replacements: { id },
    type: models.sequelize.QueryTypes.DELETE,
  });
}

async function deactivateSale(id) {
  await models.sale.update(
    {
      deleteFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id,
      },
    },
  );
}

async function updateSalesUsedCountForOrder(id) {
  await models.sequelize.query(
    'update sales as s '
      + ' inner join basketItems as b on b.saleFk = s.id '
      + ' set s.usedCount = s.usedCount + 1, s.versionNo = s.versionNo + 1 '
      + ' where b.purchaseBasketFk = :id ',
    { replacements: { id }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function getAllSales() {
  return models.sequelize.query(
    'select *, DATE_FORMAT(fromDt, "%Y-%m-%d %H:%i:%s") as fromDt, DATE_FORMAT(toDt, "%Y-%m-%d %H:%i:%s") as toDt from sales where deleteFl = false',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getSaleForProductId(productFk, isActive) {
  let query = 'select s.*, DATE_FORMAT(fromDt, "%Y-%m-%d") as fromDt, DATE_FORMAT(toDt, "%Y-%m-%d") as toDt from sales s '
    + ' inner join saleProducts sp on sp.saleFk = s.id '
    + ' inner join products p on sp.productFk = p.id where p.id = :productFk and s.deleteFl = false ';

  if (isActive === true) {
    query += ' and fromDt < :now and toDt > :now ';
  }
  const sales = await models.sequelize.query(query, {
    replacements: { productFk, now: new Date() },
    type: models.sequelize.QueryTypes.SELECT,
  });

  if (sales.length === 0) return null;

  return sales[0];
}

const getSubTotal = (price, sale, promoCode) => {
  if (sale || promoCode) {
    const floatPrice = parseFloat(price);
    const saleDiscount = sale ? (100 - sale.percentage) / 100 : 1;
    const promoCodeDiscount = promoCode ? (100 - promoCode.percentage) / 100 : 1;

    return (floatPrice * saleDiscount * promoCodeDiscount).toFixed(2);
  }
  return price;
};

module.exports = {
  createSale,
  createSaleProducts,
  deactivateSale,
  deleteSaleById,
  getAllSales,
  getProductsForSaleId,
  getProductsForSaleIdWhichOverlapDates,
  getProductsWithNoActiveSale,
  getSaleById,
  getSaleForProductId,
  getSaleProductsForSaleId,
  getSubTotal,
  midnightDate,
  setSaleForBasketItems,
  updateSale,
  updateSalesUsedCountForOrder,
};
