const models = require('../../models');
const { midnightDate, startOfDay } = require('../general/utilityHelper');
const { getAccountsWithNoOrders } = require('../order/orderOperations');

async function createPromoCodeProducts(promoCodeFk, ids) {
  if (ids.length === 0) return null;

  let query = 'insert into promoCodeProducts (promoCodeFk, productFk, deleteFl, versionNo) values ';

  ids.forEach((id) => {
    query += `(${promoCodeFk}, ${id}, false, 1),`;
  });

  query = query.substring(0, query.length - 1);

  return models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function getAllPromoCodes() {
  return models.sequelize.query(
    "select p.*, pt.promoCodeType, DATE_FORMAT(p.fromDt, '%Y-%m-%d %H:%i:%s') as fromDt,  DATE_FORMAT(p.toDt, '%Y-%m-%d %H:%i:%s') as toDt from promoCodes p "
      + ' inner join promoCodeTypes pt on p.promoCodeTypeFk = pt.id where p.deleteFl = false',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getAllPromoCodeTypes() {
  return models.promoCodeType.findAll();
}

async function getProductsWithNoActivePromoCodes(fromDtString, toDtString) {
  const fromDt = new Date(fromDtString);
  const toDt = midnightDate(toDtString);

  return models.sequelize.query(
    ' select distinct p.*, pt.productType from products p inner join productTypes pt on p.productTypeFk = pt.id where p.id not in (select pp.productFk from promoCodeProducts pp '
      + ' inner join promoCodes pc on pp.promoCodeFk = pc.id '
      + ' where pc.fromDt <= :toDt and :fromDt <= pc.toDt '
      + ' and pc.deleteFl = false) ',
    { replacements: { fromDt, toDt }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function createPromoCode(code, fromDt, toDt, description, percentage, promoCodeTypeFk, maxUses, ids) {
  const fromDttm = startOfDay(fromDt);
  const toDttm = midnightDate(toDt);
  const promoCode = await models.promoCode.create({
    code,
    fromDt: fromDttm,
    toDt: toDttm,
    description,
    promoCodeTypeFk,
    percentage,
    maxUses,
    usedCount: 0,
    deleteFl: false,
    versionNo: 1,
  });

  const productIds = JSON.parse(ids);
  await createPromoCodeProducts(promoCode.id, productIds);

  return promoCode;
}

async function getPromoCodeTypeById(id) {
  return models.promoCodeType.findOne({
    where: {
      id,
    },
  });
}

async function getPromoCodeById(id) {
  const promoCodes = await models.sequelize.query(
    'select pc.*, pt.promoCodeType, DATE_FORMAT(pc.fromDt, "%Y-%m-%d") as fromDt, DATE_FORMAT(pc.toDt, "%Y-%m-%d") as toDt from promoCodes pc inner join promoCodeTypes pt on pc.promoCodeTypeFk = pt.id where pc.id = :id ',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );

  return promoCodes.length > 0 ? promoCodes[0] : null;
}

async function getProductsForPromoCodeIdWhichOverlapDates(promoCodeFk, fromDtString, toDtString) {
  const fromDt = new Date(fromDtString);
  const toDt = midnightDate(toDtString);
  return models.sequelize.query(
    'select p.*, pt.productType from products p '
      + ' inner join promoCodeProducts pp on pp.productFk = p.id '
      + ' inner join promoCodes pc on pp.promoCodeFk = pc.id '
      + ' inner join productTypes pt on p.productTypeFk = pt.id '
      + ' where pc.deleteFl = false and pc.id = :promoCodeFk and '
      + ' pc.fromDt <= :toDt '
      + ' and pc.toDt >= :fromDt ',
    { replacements: { promoCodeFk, fromDt, toDt }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getProductsWithNoActivePromoCode(fromDtString, toDtString) {
  const fromDt = new Date(fromDtString);
  const toDt = midnightDate(toDtString);

  return models.sequelize.query(
    ' select distinct p.*, pt.productType from products p inner join productTypes pt on p.productTypeFk = pt.id where p.id not in (select pp.productFk from promoCodeProducts pp '
      + ' inner join promoCodes pc on pp.promoCodeFk = pc.id '
      + ' where pc.fromDt <= :toDt and :fromDt <= pc.toDt '
      + ' and pc.deleteFl = false) ',
    { replacements: { fromDt, toDt }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getPromoCodeProductsForPromoCodeId(promoCodeFk) {
  return models.promoCodeProduct.findAll({
    where: {
      deleteFl: false,
      promoCodeFk,
    },
  });
}

async function setPercentagePromoCodeForBasketItems(currentPromoCodeFk, promoCodeFk, productIds, percentage) {
  const ids = JSON.parse(productIds);

  const currentPromoCodeProducts = await getPromoCodeProductsForPromoCodeId(currentPromoCodeFk);
  const currentPromoCodeProductIds = currentPromoCodeProducts.map((item) => item.productFk.toString());

  const removedIds = [];
  currentPromoCodeProductIds.forEach((id) => {
    if (!ids.includes(id)) {
      removedIds.push(id);
    }
  });

  if (removedIds.length > 0) {
    // we remove promo code from basket items where product no longer in it
    await models.sequelize.query(
      ' update basketItems bi '
        + ' LEFT JOIN sales s on bi.saleFk = s.id '
        + ' LEFT JOIN promoCodes pc on bi.promoCodeFk = pc.id '
        + ' LEFT JOIN purchaseBaskets pb on bi.purchaseBasketFk = pb.id '
        + ' set bi.subTotal = bi.price * coalesce((1 - s.percentage /100), 1), '
        + ' bi.promoCodeFk = null, bi.versionNo = bi.versionNo + 1 where bi.productFk in (:removedIds) '
        + ' and (bi.purchaseBasketFk is null or pb.status != :status) and bi.deleteFl = false ',
      { replacements: { removedIds, status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
    );
  }

  if (ids.length === 0) return false;
  // check whether first order promo code
  // if not first order return false

  let query = ' update basketItems bi '
  + ' LEFT JOIN sales s on bi.saleFk = s.id'
  + ' LEFT JOIN promoCodes pc on bi.promoCodeFk = pc.id '
  + ' LEFT JOIN purchaseBaskets pb on bi.purchaseBasketFk = pb.id '
  + ' set bi.subTotal = bi.price * coalesce((1 - s.percentage /100), 1) * coalesce((1 - :percentage /100), 1), '
  + ' bi.promoCodeFk = :promoCodeFk, '
  + ' bi.versionNo = bi.versionNo + 1 where bi.productFk in (:ids) and bi.promoCodeFk = :currentPromoCodeFk'
  + ' and (bi.purchaseBasketFk is null or pb.status != :status) and bi.deleteFl = false ';

  const replacements = {
    percentage,
    currentPromoCodeFk,
    promoCodeFk,
    ids,
    status: 'Completed',
  };
  const promoCode = await getPromoCodeById(promoCodeFk);

  if (promoCode.promoCodeType === 'FirstOrder') {
    const accounts = await getAccountsWithNoOrders();
    if (accounts.length === 0) return false;

    query += ' and bi.accountFk in (:accounts)';
    replacements.accounts = accounts.map((a) => a.id);
  }

  await models.sequelize.query(
    query,
    {
      replacements,
      type: models.sequelize.QueryTypes.UPDATE,
    },
  );

  return true;
}

async function updatePromoCode(id, code, fromDt, toDt, description, percentage, promoCodeTypeFk, maxUses, productIds) {
  const fromDttm = startOfDay(fromDt);
  const currentDate = midnightDate(toDt);
  await models.promoCode.update(
    {
      code,
      fromDt: fromDttm,
      toDt: currentDate,
      description,
      percentage,
      promoCodeTypeFk,
      maxUses,
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

  const promoCode = await createPromoCode(code, fromDt, toDt, description, percentage, promoCodeTypeFk, maxUses, productIds);

  await setPercentagePromoCodeForBasketItems(id, promoCode.id, productIds, percentage);

  return promoCode;
}

async function getActivePromoCodeByCode(code) {
  const now = new Date();
  const promoCodes = await models.sequelize.query(
    'select pc.*, pt.promoCodeType from promoCodes pc inner join promoCodeTypes pt on pc.promoCodeTypeFk = pt.id where pc.code = :code  and pc.deleteFl = false and pc.fromDt <= :now and pc.toDt >= :now',
    { replacements: { code, now }, type: models.sequelize.QueryTypes.SELECT },
  );

  return promoCodes.length > 0 ? promoCodes[0] : null;
}

async function getActiveBasketItemsWherePromoCodeAppliesForAccountId(accountFk, promoCodeFk) {
  let query = 'select b.* from promoCodes pc '
  + ' inner join promoCodeProducts pcp on pcp.promoCodeFk = pc.id '
  + ' inner join basketItems b on b.productFk = pcp.productFk '
  + ' left join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
  + ' where b.accountFk = :accountFk '
  + ' and (b.purchaseBasketFk is null or pb.status <> :status ) '
  + ' and pc.deleteFl = false ';

  if (promoCodeFk) {
    query += ' and pc.id = :promoCodeFk ';
  }
  return models.sequelize.query(
    query,
    { replacements: { promoCodeFk, accountFk, status: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function applyPromoCode(promoCode, basketItemIds) {
  await models.sequelize.query(
    'update basketItems b '
      + ' LEFT JOIN sales s on b.saleFk = s.id '
      + ' LEFT JOIN promoCodes pc on b.promoCodeFk = pc.id '
      + ' set b.subTotal = b.price * coalesce((1 - s.percentage /100), 1) * coalesce((1 - :percentage /100), 1), '
      + ' b.promoCodeFk = :id, '
      + ' b.versionNo = b.versionNo + 1  '
      + ' where b.id in (:basketItemIds)',
    {
      replacements: { id: promoCode.id, percentage: promoCode.percentage, basketItemIds },
      type: models.sequelize.QueryTypes.UPDATE,
    },
  );
}

async function removePromoCode(basketItemIds) {
  await models.sequelize.query(
    'update basketItems b '
      + ' LEFT JOIN sales s on b.saleFk = s.id '
      + ' LEFT JOIN promoCodes pc on b.promoCodeFk = pc.id '
      + ' set b.subTotal = b.price * coalesce((1 - s.percentage /100), 1), '
      + ' b.promoCodeFk = null, '
      + ' b.versionNo = b.versionNo + 1  '
      + ' where b.id in (:basketItemIds)',
    {
      replacements: { basketItemIds },
      type: models.sequelize.QueryTypes.UPDATE,
    },
  );
}

async function getActivePromoCodeForBasketAndProduct(accountFk, productFk) {
  const promoCodes = await models.sequelize.query(
    ' SELECT distinct pc.* FROM basketItems b '
    + ' inner join promoCodeProducts pcp on pcp.promoCodeFk = b.promoCodeFk '
    + ' inner join promoCodes pc on pcp.promoCodeFk = pc.id '
    + ' left join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
    + ' where b.accountFk = :accountFk and pcp.productFk = :productFk '
    + ' and (b.purchaseBasketFk is null or pb.status != :status) ',
    { replacements: { accountFk, productFk, status: 'Completed' }, type: models.sequelize.QueryTypes.SELECT },
  );

  return promoCodes.length === 0 ? null : promoCodes[0];
}

async function getPromoCodeForProductId(productFk, isActive) {
  let query = 'select pc.*, DATE_FORMAT(fromDt, "%Y-%m-%d") as fromDt, DATE_FORMAT(toDt, "%Y-%m-%d") as toDt from promoCodes pc '
    + ' inner join promoCodeProducts pp on pp.promoCodeFk = pc.id '
    + ' inner join products p on pp.productFk = p.id where p.id = :productFk and pc.deleteFl = false ';

  if (isActive === true) {
    query += ' and fromDt < :now and toDt > :now ';
  }
  const promoCodes = await models.sequelize.query(query, {
    replacements: { productFk, now: new Date() },
    type: models.sequelize.QueryTypes.SELECT,
  });

  if (promoCodes.length === 0) return null;

  return promoCodes[0];
}

async function getPromoCodeTypeByName(promoCodeType) {
  return models.promoCodeType.findOne({
    where: {
      promoCodeType,
    },
  });
}

module.exports = {
  applyPromoCode,
  createPromoCode,
  createPromoCodeProducts,
  getActivePromoCodeByCode,
  getActivePromoCodeForBasketAndProduct,
  getActiveBasketItemsWherePromoCodeAppliesForAccountId,
  getAllPromoCodes,
  getAllPromoCodeTypes,
  getProductsWithNoActivePromoCodes,
  getProductsWithNoActivePromoCode,
  getProductsForPromoCodeIdWhichOverlapDates,
  getPromoCodeById,
  getPromoCodeForProductId,
  getPromoCodeProductsForPromoCodeId,
  getPromoCodeTypeById,
  getPromoCodeTypeByName,
  removePromoCode,
  setPercentagePromoCodeForBasketItems,
  updatePromoCode,
};
