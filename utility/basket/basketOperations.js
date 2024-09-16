const Sequelize = require('sequelize');
const productOperations = require('../products/productOperations');
const { uploadFile } = require('../general/utilityHelper');
const models = require('../../models');

async function getFileGroupItemsByFileGroupId(id) {
  return models.fileGroupItem.findAll({
    where: {
      fileGroupFk: id,
    },
  });
}

async function createRevisedBasketItem(basketItem, revisedBasketItems) {
  const option = await productOperations.getOptionGroupItemsForOptionGroup(basketItem.optionGroupFk);
  const finishingOption = await productOperations.getOptionGroupItemsForOptionGroup(basketItem.finishingOptionGroupFk);
  const quantities = await productOperations.getQuantitiesForProduct(basketItem.productFk);

  const result = basketItem;

  if (basketItem.fileGroupFk != null) {
    const fileGroupItems = await getFileGroupItemsByFileGroupId(basketItem.fileGroupFk);
    result.fileGroupItems = fileGroupItems;
  }
  result.cost = (parseFloat(basketItem.price) / parseFloat(basketItem.quantity)).toFixed(2);
  result.options = option;
  result.finishingOptions = finishingOption;
  result.quantities = quantities;
  result.saleAmount = result.saleFk !== null ? (parseFloat(result.price) * (result.salePercentage / 100)).toFixed(2) : 0;
  result.discount = (parseFloat(basketItem.price) - parseFloat(basketItem.subTotal)).toFixed(2);
  if (result.promoCodeFk !== null) {
    if (result.saleFk !== null) {
      result.promoCodeAmount = (parseFloat(result.discount) - result.saleAmount).toFixed(2);
    } else {
      result.promoCodeAmount = (parseFloat(result.price) * (result.promoCodePercentage / 100)).toFixed(2);
    }
  } else {
    result.promoCodeAmount = 0;
  }
  result.discount = (parseFloat(basketItem.price) - parseFloat(basketItem.subTotal)).toFixed(2);
  revisedBasketItems.push(result);
  return {
    total: parseFloat(basketItem.price),
    subTotal: parseFloat(basketItem.subTotal),
    discount: parseFloat(result.discount),
    saleAmount: parseFloat(result.saleAmount),
    promoCodeAmount: parseFloat(result.promoCodeAmount),
    sale: result.sale,
    code: result.code,
  };
}

async function getActiveBasketItemsForAccount(accountId) {
  const basketItems = await models.sequelize.query(
    ' select b.*, b.price, p.name, p.image1Path, q.quantity, s.name as sale, pc.code, s.percentage as salePercentage, pc.percentage as promoCodePercentage from basketItems b '
      + ' inner join products p on b.productFk = p.id '
      + ' inner join quantities q on b.quantityFk = q.id '
      + ' left join sales s on b.saleFk = s.id '
      + ' left join promoCodes pc on b.promoCodeFk = pc.id '
      + ' where b.accountFk = :accountId '
      + ' and (b.purchaseBasketFk is null or b.purchaseBasketFk = (select id from purchaseBaskets where id = b.purchaseBasketFk and status != :completed )) '
      + ' and b.deleteFl = false '
      + ' and p.deleteFl = false',
    {
      replacements: { accountId, completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const revisedBasketItems = [];
  const totalCosts = await Promise.all(basketItems.map((basketItem) => createRevisedBasketItem(basketItem, revisedBasketItems)));
  let totalCost = 0;
  let subTotalCost = 0;
  let totalDiscount = 0;
  let totalSaleAmount = 0;
  let totalPromoCodeAmount = 0;
  let sale = null;
  let code = null;
  totalCosts.forEach((t) => {
    totalCost += t.total;
    subTotalCost += t.subTotal;
    totalDiscount += t.discount;
    totalSaleAmount += t.saleAmount;
    totalPromoCodeAmount += t.promoCodeAmount;
    if (t.code) {
      code = t.code;
    }

    if (t.sale) {
      sale = t.sale;
    }
  });
  return {
    basketItems: revisedBasketItems,
    subTotalCost: subTotalCost.toFixed(2),
    totalCost: totalCost.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    totalSaleAmount: totalSaleAmount.toFixed(2),
    totalPromoCodeAmount: totalPromoCodeAmount.toFixed(2),
    code,
    sale,
  };
}

async function editBasketItem(basketItemId, optionGroupId, finishingOptionGroupId, quantityId, price, subTotal, sale) {
  await models.basketItem.update(
    {
      optionGroupFk: optionGroupId,
      finishingOptionGroupFk: finishingOptionGroupId,
      quantityFk: quantityId,
      price,
      subTotal,
      sale,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: basketItemId,
      },
    },
  );
}

async function createBasketItem(
  accountId,
  productId,
  optionGroupId,
  finishingOptionGroupId,
  quantityId,
  price,
  subTotal,
  saleFk,
  promoCodeFk,
) {
  return models.basketItem.create({
    accountFk: accountId,
    productFk: productId,
    optionGroupFk: optionGroupId,
    finishingOptionGroupFk: finishingOptionGroupId,
    quantityFk: quantityId,
    price,
    subTotal,
    saleFk,
    promoCodeFk,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getPurchaseBasketById(id) {
  return models.purchaseBasket.findOne({
    where: {
      id,
    },
  });
}

async function getFileGroupById(id) {
  return models.fileGroup.findOne({
    where: {
      id,
    },
  });
}

async function getBasketItem(id) {
  return models.basketItem.findOne({
    where: {
      id,
    },
  });
}

async function removeBasketItem(basketItemId) {
  const basketItem = await getBasketItem(basketItemId);
  const purchaseBasketId = basketItem.purchaseBasketFk;
  const fileGroupId = basketItem.fileGroupFk;
  const optionGroupId = basketItem.optionGroupFk;

  await basketItem.destroy();
  if (purchaseBasketId != null) {
    await models.sequelize.query('delete from purchaseBaskets where id = :id', {
      replacements: { id: purchaseBasketId },
      type: models.sequelize.QueryTypes.DELETE,
    });
  }

  if (fileGroupId != null) {
    await models.sequelize.query('delete from fileGroupItems where fileGroupFk = :fileGroupFk', {
      replacements: { fileGroupFk: fileGroupId },
      type: models.sequelize.QueryTypes.DELETE,
    });

    await models.sequelize.query('delete from fileGroups where id = :id', {
      replacements: { id: fileGroupId },
      type: models.sequelize.QueryTypes.DELETE,
    });
  }

  await models.sequelize.query('delete from optionGroupItems where optionGroupFk = :id', {
    replacements: { id: optionGroupId },
    type: models.sequelize.QueryTypes.DELETE,
  });

  await models.sequelize.query('delete from optionGroups where id = :id', {
    replacements: { id: optionGroupId },
    type: models.sequelize.QueryTypes.DELETE,
  });
}

async function updateQuantityPriceForBasketItem(basketItemId, quantityId) {
  const basketItem = await getBasketItem(basketItemId);

  let optionGroupIdForProductPriceRow = await models.sequelize.query(
    'SELECT og.id FROM optionGroups og '
      + ' INNER JOIN optionGroupItems ogi ON og.id = ogi.optionGroupFk '
      + ' inner join priceMatrixRows pmr on pmr.optionGroupFk = og.id '
      + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
      + ' WHERE ogi.optionFk IN ( '
      + ' SELECT ogi1.optionFk '
      + ' FROM optionGroupItems ogi1 '
      + ' WHERE ogi1.optionGroupFk = :optionGroupId '
      + ' ) '
      + ' and og.id <> :optionGroupId '
      + ' and pm.productFk = :productId '
      + ' and pm.deleteFl = false '
      + ' GROUP BY og.id '
      + ' HAVING COUNT(DISTINCT ogi.optionFk) = ( '
      + '     SELECT COUNT(DISTINCT ogi2.optionFk) '
      + '     FROM optionGroupItems ogi2 '
      + '     WHERE ogi2.optionGroupFk = :optionGroupId '
      + ' )',
    {
      replacements: {
        optionGroupId: basketItem.optionGroupFk,
        productId: basketItem.productFk,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
  optionGroupIdForProductPriceRow = optionGroupIdForProductPriceRow[0].id;

  const priceMatrixRowQuantityPrices = await models.sequelize.query(
    'select pq.* from priceMatrixRowQuantityPrices pq '
      + ' inner join priceMatrixRows pr on pq.priceMatrixRowFk = pr.id '
      + ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id '
      + ' where pr.optionGroupFk = :optionGroupId '
      + ' and pq.quantityFk = :quantityId '
      + ' and pm.deleteFl = false ',
    {
      replacements: {
        optionGroupId: optionGroupIdForProductPriceRow,
        quantityId,
      },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const priceMatrixRowQuantityPrice = priceMatrixRowQuantityPrices[0];

  await models.basketItem.update(
    {
      quantityFk: quantityId,
      price: priceMatrixRowQuantityPrice.price,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: basketItemId,
      },
    },
  );
}

async function createFileGroup() {
  return models.fileGroup.create({
    deleteFl: false,
    versionNo: 1,
  });
}

async function createFileGroupItem(fileGroupId, path, fileName) {
  return models.fileGroupItem.create({
    fileGroupFk: fileGroupId,
    path,
    fileName,
    deleteFl: false,
    versionNo: 1,
  });
}

async function setFileGroupForBasketItem(id, fileGroupFk) {
  await models.basketItem.update(
    {
      fileGroupFk,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id,
      },
    },
  );
}

async function uploadDesignForBasketItem(file, basketItemId) {
  const s3Path = await uploadFile('BasketItem', file);

  const basketItem = await getBasketItem(basketItemId);
  let { fileGroupFk } = basketItem;
  if (fileGroupFk == null) {
    const fileGroup = await createFileGroup();
    fileGroupFk = fileGroup.id;
    await setFileGroupForBasketItem(basketItemId, fileGroupFk);
  }

  const fileGroupItem = await createFileGroupItem(fileGroupFk, s3Path, file.name);

  return { s3Path, fileGroupItem };
}

async function getFileGroupItemsForBasketItem(basketItem) {
  const { fileGroupFk } = basketItem;

  if (!fileGroupFk) return [];

  return models.fileGroupItem.findAll({
    where: {
      fileGroupFk,
    },
  });
}

async function getFileGroupItemById(id) {
  return models.fileGroupItem.findOne({
    where: {
      id,
    },
  });
}

async function removeFileGroupItem(fileGroupItemId, basketItemId) {
  const fileGroupItem = await getFileGroupItemById(fileGroupItemId);

  const fileGroupId = fileGroupItem.fileGroupFk;
  await fileGroupItem.destroy();

  const fileGroupItems = await getFileGroupItemsByFileGroupId(fileGroupId);

  if (fileGroupItems.length === 0) {
    const fileGroup = await getFileGroupById(fileGroupId);
    await setFileGroupForBasketItem(basketItemId, null);
    await fileGroup.destroy();
  }
}

async function setBasketItemsAccountId(accountId, basketItemIds) {
  await models.basketItem.update(
    {
      accountFk: accountId,
    },
    {
      where: {
        id: { [Sequelize.Op.in]: basketItemIds },
      },
    },
  );
}

async function getAllBasketItemsForCheckout(accountId) {
  const getActiveBasketItemsDetails = await getActiveBasketItemsForAccount(accountId);
  const { basketItems, subTotalCost, totalCost } = getActiveBasketItemsDetails;

  const basketItemsForCheckout = basketItems.filter((b) => b.fileGroupFk != null);

  return {
    basketItems: basketItemsForCheckout,
    subTotalCost,
    totalCost,
  };
}

function getTotalsFromBasketItems(basketItems) {
  let subtotal = 0;
  let total = 0;
  basketItems.forEach((b) => {
    subtotal += parseFloat(b.price);
    total += parseFloat(b.subTotal);
  });

  return { subTotal: subtotal.toFixed(2), total: total.toFixed(2) };
}

async function setPurchaseBasketForBasketItem(basketItemId, purchaseBasketId) {
  await models.basketItem.update(
    {
      purchaseBasketFk: purchaseBasketId,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: basketItemId,
      },
    },
  );
}

async function getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasketId) {
  const result = await models.sequelize.query(
    'select b.*, p.name as productName, q.quantity, ot.optionType, o.name as optionName, s.name as saleName, s.percentage from basketItems b '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' inner join products p on b.productFk = p.id '
      + ' inner join optionGroupItems ogi on ogi.optionGroupFk = b.optionGroupFk '
      + ' inner join options o on ogi.optionFk = o.id '
      + ' inner join optionTypes ot on o.optionTypeFk = ot.id '
      + ' inner join quantities q on b.quantityFk = q.id '
      + ' left join sales s on b.saleFk = s.id '
      + ' where pb.id = :purchaseBasketId ',
    {
      replacements: { purchaseBasketId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const basketItems = [];
  await Promise.all(result.map((basketItem) => createRevisedBasketItem(basketItem, basketItems)));

  const revisedBasketItems = basketItems.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index);

  return revisedBasketItems;
}

async function getBasketItemsForOrderId(purchaseBasketFk) {
  const basketItems = await models.sequelize.query(
    ' select b.*, b.price, p.name, p.image1Path, q.quantity, s.name as sale, pc.code, s.percentage as salePercentage, pc.percentage as promoCodePercentage from basketItems b '
      + ' inner join products p on b.productFk = p.id '
      + ' inner join quantities q on b.quantityFk = q.id '
      + ' left join sales s on b.saleFk = s.id '
      + ' left join promoCodes pc on b.promoCodeFk = pc.id '
      + ' inner join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' where b.purchaseBasketFk = :purchaseBasketFk '
      + ' and pb.status = :completed '
      + ' and b.deleteFl = false '
      + ' and p.deleteFl = false',
    {
      replacements: { purchaseBasketFk, completed: 'Completed' },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );

  const revisedBasketItems = [];
  const totalCosts = await Promise.all(basketItems.map((basketItem) => createRevisedBasketItem(basketItem, revisedBasketItems)));
  let totalCost = 0;
  let subTotalCost = 0;
  let totalDiscount = 0;
  let totalSaleAmount = 0;
  let totalPromoCodeAmount = 0;
  let sale = null;
  let code = null;
  totalCosts.forEach((t) => {
    totalCost += t.total;
    subTotalCost += t.subTotal;
    totalDiscount += t.discount;
    totalSaleAmount += t.saleAmount;
    totalPromoCodeAmount += t.promoCodeAmount;
    if (t.code) {
      code = t.code;
    }

    if (t.sale) {
      sale = t.sale;
    }
  });
  return {
    basketItems: revisedBasketItems,
    subTotalCost: subTotalCost.toFixed(2),
    totalCost: totalCost.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    totalSaleAmount: totalSaleAmount.toFixed(2),
    totalPromoCodeAmount: totalPromoCodeAmount.toFixed(2),
    code,
    sale,
  };
}

async function getBasketItemsWithSaleId(saleFk) {
  return models.basketItem.findAll({
    where: {
      saleFk,
    },
  });
}

async function deleteSalesFromBasketItems(saleId) {
  await models.sequelize.query(
    'update basketItems set saleFk = null, subTotal = price where saleFk = :id and purchaseBasketFk is null',
    { replacements: { id: saleId }, type: models.sequelize.QueryTypes.UPDATE },
  );

  await models.sequelize.query(
    'UPDATE basketItems b '
      + ' INNER JOIN purchaseBaskets pb ON b.purchaseBasketFk = pb.id '
      + ' SET b.saleFk = NULL, b.subTotal = b.price '
      + ' WHERE b.saleFk = 1 AND pb.status != :status ',
    { replacements: { id: saleId, status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function removeExpiredPromoCodesAndSalesFromBasketItems() {
  await models.sequelize.query(
    'update basketItems b '
      + ' inner join promoCodes pc on b.promoCodeFk = pc.id '
      + ' left join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' left join sales s on b.saleFk = s.id '
      + ' set b.promoCodeFk = null, b.versionNo = b.versionNo + 1, '
      + ' b.subTotal = b.price * coalesce((1 - s.percentage /100), 1) '
      + ' where pc.deleteFl = false and pc.toDt < curDate() '
      + ' and (pb.status != :status or b.purchaseBasketFk is null)',
    { replacements: { status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
  );

  await models.sequelize.query(
    ' update basketItems b '
      + ' inner join sales s on b.saleFk = s.id '
      + ' left join purchaseBaskets pb on b.purchaseBasketFk = pb.id '
      + ' left join promoCodes pc on b.promoCodeFk = pc.id '
      + ' set b.saleFk = null, b.versionNo = b.versionNo + 1, '
      + ' b.subTotal = b.price * coalesce((1 - pc.percentage /100), 1) '
      + ' where s.deleteFl = false and s.toDt < curDate() '
      + ' and (pb.status != :status or b.purchaseBasketFk is null)',
    { replacements: { status: 'Completed' }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

module.exports = {
  createFileGroup,
  createFileGroupItem,
  createRevisedBasketItem,
  getActiveBasketItemsForAccount,
  getBasketItemsForOrderId,
  createBasketItem,
  removeBasketItem,
  getPurchaseBasketById,
  getBasketItem,
  updateQuantityPriceForBasketItem,
  uploadDesignForBasketItem,
  getFileGroupItemsForBasketItem,
  removeFileGroupItem,
  setBasketItemsAccountId,
  getAllBasketItemsForCheckout,
  getTotalsFromBasketItems,
  setPurchaseBasketForBasketItem,
  getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId,
  editBasketItem,
  getFileGroupItemsByFileGroupId,
  getFileGroupById,
  setFileGroupForBasketItem,
  getFileGroupItemById,
  getBasketItemsWithSaleId,
  deleteSalesFromBasketItems,
  removeExpiredPromoCodesAndSalesFromBasketItems,
};
