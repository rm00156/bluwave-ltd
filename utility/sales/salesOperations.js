const models = require('../../models');
const { midnightDate } = require('../general/utilityHelper');

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
      'update basketItems set subTotal = price, saleFk = null, versionNo = versionNo + 1 where productFk in (:removedIds) and purchaseBasketFk is null and deleteFl = false',
      { replacements: { removedIds }, type: models.sequelize.QueryTypes.UPDATE },
    );

    await models.sequelize.query(
      'UPDATE basketItems b '
        + ' INNER JOIN purchaseBaskets pb ON b.purchaseBasketFk = pb.id '
        + ' set b.subTotal = b.price, b.saleFk = null, b.versionNo = b.versionNo + 1 '
        + ' WHERE pb.status != :status and b.deleteFl = false and b.productFk in (:removedIds)',
      { replacements: { removedIds, status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
    );
  }

  if (ids.length === 0) return false;

  await models.sequelize.query(
    'update basketItems set subTotal = ((100 - :percentage)/100 * price), saleFk = :saleFk, versionNo = versionNo + 1 where productFk in (:ids) and purchaseBasketFk is null and deleteFl = false',
    { replacements: { percentage, saleFk, ids }, type: models.sequelize.QueryTypes.UPDATE },
  );

  await models.sequelize.query(
    'UPDATE basketItems b '
      + ' INNER JOIN purchaseBaskets pb ON b.purchaseBasketFk = pb.id '
      + ' set b.subTotal = ((100 - :percentage)/100 * b.price), b.saleFk = :saleFk, b.versionNo = b.versionNo + 1 '
      + ' WHERE pb.status != :status and b.deleteFl = false and b.productFk in (:ids)',
    {
      replacements: {
        saleFk,
        ids,
        percentage,
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
  const toDttm = midnightDate(toDt);
  const sale = await models.sale.create({
    name,
    fromDt,
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
    replacements: { productFk, now: new Date() }, type: models.sequelize.QueryTypes.SELECT,
  });

  if (sales.length === 0) return null;

  return sales[0];
}

const getSubTotal = (price, sale) => {
  if (sale) {
    return parseFloat((parseFloat(price) / 100) * (100 - sale.percentage)).toFixed(2);
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
