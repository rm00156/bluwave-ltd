const logger = require('pino')();
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client } = require('@aws-sdk/client-s3');
const { Op } = require('sequelize');
const { isEmpty } = require('lodash');
const Sequelize = require('sequelize');
const { getExtension, hasTheSameItems } = require('../general/utilityHelper');
const { getProductDeliveriesForProduct } = require('../delivery/deliveryOperations');
const models = require('../../models');

const env = process.env.NODE_ENV || 'development';
const TEST = 'test';
const DEVELOPMENT = 'development';

async function getPriceMatrixById(id) {
  return models.priceMatrix.findOne({
    where: {
      id,
    },
  });
}

async function getAttributeTypeByType(attributeType) {
  return models.attributeType.findOne({
    where: {
      attributeType,
    },
  });
}

async function getAllAttributeTypes() {
  return models.attributeType.findAll();
}

async function getQuantityGroupForProductId(productId) {
  return models.quantityGroup.findOne({
    where: {
      productFk: productId,
    },
  });
}

async function getQuantityGroupById(id) {
  return models.quantityGroup.findOne({
    where: {
      id,
    },
  });
}

async function getQuantityGroupItemsByQuantityGroup(quantityGroupFk) {
  return models.quantityGroupItem.findAll({
    where: {
      quantityGroupFk,
      deleteFl: false,
    },
  });
}

async function createQuantityGroupItem(quantityGroupId, quantityId) {
  await models.quantityGroupItem.create({
    quantityGroupFk: quantityGroupId,
    quantityFk: quantityId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createQuantityGroup(productFk) {
  return models.quantityGroup.create({
    productFk,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getOptionsByIds(options) {
  return models.option.findAll({
    where: {
      id: {
        [Op.in]: options,
      },
      deleteFl: false,
    },
  });
}

async function getAllOptions() {
  return models.option.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function createOptionTypeGroup(productId, attributeTypeId) {
  return models.optionTypeGroup.create({
    productFk: productId,
    attributeTypeFk: attributeTypeId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createOptionGroup() {
  return models.optionGroup.create({
    deleteFl: false,
    versionNo: 1,
  });
}

async function createOptionGroupItem(optionGroupId, optionId) {
  return models.optionGroupItem.create({
    optionGroupFk: optionGroupId,
    optionFk: optionId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createPriceMatrixRow(priceMatrixId, optionGroupId, orderNo) {
  return models.priceMatrixRow.create({
    priceMatrixFk: priceMatrixId,
    optionGroupFk: optionGroupId,
    orderNo,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getPrintingAttributeType() {
  return getAttributeTypeByType('Printing');
}

async function createPriceMatrixRowQuantityPricesForRow(priceMatrixRowId, quantityDetails) {
  if (quantityDetails.length === 0) return;

  let query = 'insert into priceMatrixRowQuantityPrices (priceMatrixRowFk, quantityFk, price, deleteFl, versionNo) values ';
  quantityDetails.forEach((q) => {
    query += `(${priceMatrixRowId}, ${q.id}, ${q.price}, false, 1),`;
  });

  query = query.slice(0, -1);

  await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function getOptionGroupItemsForOptionGroup(optionGroupId) {
  return models.sequelize.query(
    'select o.name, o.id, ot.optionType from optionGroupItems ogi '
      + ' inner join options o on ogi.optionFk = o.id '
      + ' inner join optionTypes ot on o.optionTypeFk = ot.id '
      + ' where ogi.optionGroupFk = :optionGroupId ',
    {
      replacements: { optionGroupId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function handleGetRowDetail(optionGroupId, rows, result) {
  let row = result.filter((o) => o.optionGroupFk === optionGroupId);
  row = row.sort((a, b) => a.quantity - b.quantity);
  // get optionGroupItems
  const optionGroupItems = await getOptionGroupItemsForOptionGroup(optionGroupId);

  const updatedRow = row.map((r) => ({ ...r, options: optionGroupItems }));
  rows.push(updatedRow);
}

async function getRowDetails(result) {
  const optionGroupIds = Array.from(new Set(result.map((o) => o.optionGroupFk)));
  const rows = [];
  await Promise.all(optionGroupIds.map((optionGroupId) => handleGetRowDetail(optionGroupId, rows, result)));

  return rows;
}

async function createFinishingMatrixRowQuantityPrice(finishingMatrixRowId, quantityId, price) {
  return models.finishingMatrixRowQuantityPrice.create({
    finishingMatrixRowFk: finishingMatrixRowId,
    quantityFk: quantityId,
    price: price === '' ? null : price,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createFinishingMatrixRowQuantityPrices(finishingMatrixRowId, quantityDetails) {
  if (quantityDetails.length === 0) return;

  let query = 'insert into finishingMatrixRowQuantityPrices (finishingMatrixRowFk, quantityFk, price, deleteFl, versionNo) values ';
  quantityDetails.forEach((q) => {
    query += `(${finishingMatrixRowId}, ${q.id}, ${q.price}, false, 1),`;
  });

  query = query.slice(0, -1);

  await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function isMatrixDetailsComplete(matrix) {
  for (let i = 0; i < matrix.length; i += 1) {
    const row = matrix[i];
    const { quantityGroup } = row;
    const pricesNotSet = quantityGroup.filter((q) => q.price === '');

    if (pricesNotSet.length > 0) {
      return false;
    }
  }

  return true;
}

async function deletePriceMatrixRowQuantityPricesForPriceMatrixRow(productId) {
  await models.sequelize.query(
    'update priceMatrixRowQuantityPrices as pmrqr1 '
      + ' inner join priceMatrixRowQuantityPrices as pmrqr2 on pmrqr1.id = pmrqr2.id '
      + ' inner join priceMatrixRows pmr on pmrqr2.priceMatrixRowFk = pmr.id '
      + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' set pmrqr1.deleteFl = true, pmrqr1.versionNo = pmrqr1.versionNo + 1 '
      + ' where pm.deleteFl = false and p.id = :productId',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deleteOptionGroupItemsForProduct(productId) {
  await models.sequelize.query(
    'update optionGroupItems as ogi1 '
      + ' inner join optionGroupItems as ogi2 on ogi1.id = ogi2.id '
      + ' inner join priceMatrixRows pmr on pmr.optionGroupFk = ogi2.optionGroupFk '
      + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' set ogi1.deleteFl = true, ogi1.versionNo = ogi1.versionNo + 1 '
      + ' where pm.deleteFl = false and p.id = :productId',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deletePriceMatrixRowsForProduct(productId) {
  await models.sequelize.query(
    'update priceMatrixRows as pmr1 '
      + ' inner join priceMatrixRows as pmr2 on pmr1.id = pmr2.id '
      + ' inner join priceMatrices pm on pmr2.priceMatrixFk = pm.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' set pmr1.deleteFl = true, pmr1.versionNo = pmr1.versionNo + 1 '
      + ' where pm.deleteFl = false and p.id = :productId',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deleteOptionGroupsForPriceMatrix(productId) {
  await models.sequelize.query(
    'update optionGroups as og1 '
      + ' inner join optionGroups as og2 on og1.id = og2.id '
      + ' inner join priceMatrixRows as pmr on pmr.optionGroupFk = og2.id '
      + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' set og1.deleteFl = true, og1.versionNo = og1.versionNo + 1 '
      + ' where pm.deleteFl = false and p.id = :productId',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function getFinishingOptionTypesForProduct(productId) {
  return models.sequelize.query(
    'select distinct ot.* from finishingMatrices fm '
      + ' inner join optionTypeGroupItems otgi on otgi.optionTypeGroupFk = fm.optionTypeGroupFk '
      + ' inner join optionTypes ot on otgi.optionTypeFk = ot.id '
      + ' inner join products p on fm.productFk = p.id '
      + ' where fm.deleteFl = false and p.id = :productId ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionTypesNotUsedByFinishingMatrixForProduct(productId) {
  // get optionTypes For finishinmatrix

  return models.sequelize.query(
    'select distinct * from optionTypes where id not in (select ot.id from finishingMatrices fm '
      + ' inner join optionTypes ot on ot.id = fm.optionTypeFk '
      + ' inner join products p on fm.productFk = p.id '
      + ' where fm.deleteFl = false and p.id = :productId) ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionTypesNotUsedByPricingMatrixForProduct(productId) {
  // get optionTypes For finishinmatrix

  return models.sequelize.query(
    'select distinct * from optionTypes where id not in (select ot.id from priceMatrices pm '
      + ' inner join optionTypeGroupItems otgi on otgi.optionTypeGroupFk = pm.optionTypeGroupFk '
      + ' inner join optionTypes ot on otgi.optionTypeFk = ot.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' where pm.deleteFl = false and p.id = :productId) ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getFinishingMatricesForProductId(productId) {
  return models.finishingMatrix.findAll({
    where: {
      productFk: productId,
      deleteFl: false,
    },
    order: [['orderNo', 'ASC']],
  });
}

async function deleteOptionTypeGroupAndItemsForProductId(productId, attributeType) {
  await models.sequelize.query(
    'update optionTypeGroupItems as otgi1 '
      + ' inner join optionTypeGroupItems as otgi2 on otgi1.id = otgi2.id '
      + ' inner join optionTypeGroups otg on otgi2.optionTypeGroupFk = otg.id '
      + ' inner join attributeTypes a on otg.attributeTypeFk = a.id '
      + ' inner join products p on otg.productFk = p.id '
      + ' set otgi1.deleteFl = true, otgi1.versionNo = otgi1.versionNo + 1 '
      + ' where otg.deleteFl = false and p.id = :productId '
      + ' and a.attributeType = :attributeType',
    {
      replacements: { productId, attributeType },
      type: models.sequelize.QueryTypes.UPDATE,
    },
  );

  await models.optionTypeGroup.update(
    {
      deleteFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        productFk: productId,
        deleteFl: false,
      },
    },
  );
}

function updateProductDetailsWithPicturesAndBulletPoints(s3PathMap, productDetails, bulletPoints) {
  const updatedProductDetails = { ...productDetails };
  s3PathMap.forEach((value, key) => {
    updatedProductDetails[`image${key}Path`] = value;
  });

  let descriptionCount = 1;
  bulletPoints.forEach((bulletPoint) => {
    const trimmed = bulletPoint.replace(/\s+$/, '');
    if (trimmed !== '') {
      updatedProductDetails[`descriptionPoint${descriptionCount}`] = bulletPoint;
      descriptionCount += 1;
    }
  });
  return updatedProductDetails;
}

async function getFinishingMatrixRowQuantityPricesForProductIdAndOptionType(productId, optionType) {
  return models.sequelize.query(
    'select distinct q.quantity, o.name as optionName, o.id as optionId, fmr.*, fq.*, fq.id as finishingMatrixRowQuantityPriceId from finishingMatrices fm '
      + ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id '
      + ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id '
      + ' inner join optionTypes ot on fm.optionTypeFk = ot.id '
      + ' inner join quantities q on fq.quantityFk = q.id '
      + ' inner join options o on fmr.optionFK = o.id '
      + ' where fm.productFk = :productId and ot.optionType = :optionType '
      + ' and fm.deleteFl = false '
      + ' and fmr.deleteFl = false '
      + ' and fq.deleteFl = false '
      + ' order by fmr.orderNo asc',
    {
      replacements: { productId, optionType },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getAllActiveProductTypes() {
  return models.productType.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function getAllProductTypes() {
  return models.productType.findAll();
}

async function getProductTypeByType(type) {
  return models.productType.findOne({
    where: {
      productType: type,
      deleteFl: false,
    },
  });
}

async function getActiveProductTypeById(id) {
  return models.productType.findOne({
    where: {
      id,
      deleteFl: false,
    },
  });
}

async function getProductTypeById(id) {
  return models.productType.findOne({
    where: {
      id,
    },
  });
}

async function getAllActiveProducts() {
  return models.product.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function getAllProducts() {
  return models.sequelize.query(
    'select p.*, pt.productType from products p inner join productTypes pt on p.productTypeFk = pt.id ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getProductByProductName(productName) {
  return models.product.findOne({
    where: {
      name: productName,
      deleteFl: false,
    },
  });
}

async function getProductById(id) {
  return models.product.findOne({
    where: {
      id,
    },
  });
}

async function getOptionGroupForProductId(productId) {
  return models.optionGroup.findOne({
    where: {
      productFk: productId,
    },
  });
}

async function getAllProductsByProductTypeId(productTypeId) {
  return models.product.findAll({
    where: {
      productTypeFk: productTypeId,
      deleteFl: false,
    },
  });
}
async function getLowestPriceWithQuantityForProductByProductId(productId) {
  const result = await models.sequelize.query(
    'select quantity, pmrqp.price from products p '
      + ' inner join priceMatrices pm on pm.productFk = p.id '
      + ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id '
      + ' inner join priceMatrixRowQuantityPrices pmrqp on pmrqp.priceMatrixRowFk = pmr.id '
      + ' inner join quantities q on pmrqp.quantityFk = q.id '
      + ' where p.id = :productId '
      + ' and pm.deleteFl = false '
      + ' order by pmrqp.price asc limit 1',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );

  if (result.length > 0) return result[0];
  return null;
}

async function getAllOptionTypes() {
  return models.optionType.findAll({
    where: {
      deleteFl: false,
    },
  });
}

async function getAllOptionTypesWithOptions() {
  return models.sequelize.query(
    'select distinct ot.* from optionTypes ot inner join options o on o.optionTypeFk = ot.id where o.deleteFl = false',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getAllQuantities() {
  return models.quantity.findAll({
    order: [['quantity', 'ASC']],
    where: {
      deleteFl: false,
    },
  });
}

function updateQuantityPriceTableToIncludeFinishingMatrixTable(quantityPriceTable, finishingQuantityPriceMap) {
  const updatedQuantityPriceTable = quantityPriceTable.map((q) => {
    const { quantityId } = q;
    const { pricePer, price } = finishingQuantityPriceMap.get(quantityId);
    return {
      ...q,
      price: (parseFloat(q.price) + price).toFixed(2),
      pricePer: (parseFloat(q.pricePer) + pricePer).toFixed(2),
    };
  });
  return updatedQuantityPriceTable;
}

async function getQuantityPriceTable(options, finishingOptions, productId) {
  let query = 'select q.quantity, q.id as quantityId, pmrqpr.id as priceMatrixRowQuantityRowId, pmrqpr.price, pmrqpr.price/q.quantity as pricePer from priceMatrixRowQuantityPrices pmrqpr '
    + ' inner join priceMatrixRows pmr on pmrqpr.priceMatrixRowFk = pmr.id '
    + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id  '
    + ' inner join quantities q on pmrqpr.quantityFk = q.id '
    + ' where pm.deleteFl = false and pmr.optionGroupFk = ( '
    + ' SELECT  ogi.optiongroupFk from priceMatrixRowQuantityPrices pmrqpr  '
    + ' inner join priceMatrixRows pmr on pmrqpr.priceMatrixRowFk = pmr.id '
    + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
    + ' inner join products p on pm.productFk = p.id '
    + ' inner join optionGroupItems ogi on pmr.optionGroupFk = ogi.optionGroupFk '
    + ' where p.id = :productId '
    + ' and pm.deleteFl = false '
    + ' GROUP BY ogi.optionGroupFk '
    + ' HAVING SUM(ogi.optionFk NOT IN (';
  // 3, 11, 1)) = 0) ' +

  let count = 0;
  const replacements = {};
  options.forEach((option) => {
    query = `${query}:option${count},`;
    replacements[`option${count}`] = option.value;
    count += 1;
  });
  replacements.productId = productId;

  query = query.substring(0, query.length - 1);
  query = `${query})) = 0 ) order by q.quantity asc`;

  const quantityPriceTable = await models.sequelize.query(query, {
    replacements,
    type: models.sequelize.QueryTypes.SELECT,
  });
  // return quantityPriceTable;

  if (finishingOptions.length > 0) {
    const finishingPriceTable = await models.sequelize.query(
      'select q.quantity, q.id as quantityId, fq.id as finishingMatrixRowQuantityPriceId, fq.price, fq.price/q.quantity as pricePer  from finishingMatrices fm '
        + ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id '
        + ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id '
        + ' inner join quantities q on fq.quantityFk = q.id '
        + ' where fmr.optionFk in (:options) '
        + ' and fm.deleteFl = false '
        + ' and fm.productFk = :productId',
      {
        replacements: {
          productId,
          options: finishingOptions.map((f) => f.value),
        },
        type: models.sequelize.QueryTypes.SELECT,
      },
    );

    const quantities = new Set(finishingPriceTable.map((f) => f.quantityId));
    const finishingQuantityPriceMap = new Map();

    quantities.forEach((quantityId) => {
      const finishingQuantityRows = finishingPriceTable.filter((f) => f.quantityId === quantityId);

      let price = 0;
      let pricePer = 0;

      finishingQuantityRows.forEach((fqr) => {
        price += parseFloat(fqr.price);
        pricePer += parseFloat(fqr.pricePer);
      });

      finishingQuantityPriceMap.set(quantityId, { price, pricePer });
    });

    return updateQuantityPriceTableToIncludeFinishingMatrixTable(quantityPriceTable, finishingQuantityPriceMap);
    // quantityPriceTable.forEach((qr) => {
    //   const { quantityId } = qr;
    //   const { pricePer, price } = finishingQuantityPriceMap.get(quantityId);
    //   qr.price = (parseFloat(qr.price) + price).toFixed(2);
    //   qr.pricePer = (parseFloat(qr.pricePer) + pricePer).toFixed(2);
    // });
  }

  return quantityPriceTable;
}

function mapToObject(results) {
  const map = new Map();

  results.forEach((result) => {
    const { optionTypeId } = result;
    const { optionType } = result;
    const { optionId } = result;
    const { name } = result;

    if (!map.has(optionType)) {
      map.set(optionType, []);
    }

    const options = map.get(optionType);
    const option = {
      optionId,
      name,
      optionTypeId,
    };

    options.push(option);

    map.set(optionType, options);
  });

  const mapAsObject = Object.fromEntries(map);

  return mapAsObject;
}

async function getPricingMatrixOptionTypesAndOptionsForProduct(productId) {
  const results = await models.sequelize.query(
    'SELECT distinct ot.id AS optionTypeId, ot.optionType, o.id AS optionId, o.name '
      + ' FROM products p '
      + ' INNER JOIN priceMatrices pm ON pm.productFk = p.id '
      + ' INNER JOIN priceMatrixRows pmr ON pmr.priceMatrixFk = pm.id '
      + ' INNER JOIN optionGroupItems ogi ON ogi.optionGroupFk = pmr.optionGroupFk '
      + ' INNER JOIN options o ON ogi.optionFk = o.id '
      + ' INNER JOIN optionTypes ot ON o.optionTypeFk = ot.id '
      + ' WHERE p.id = :productId '
      + ' and pm.deleteFl = false ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );

  if (results.length === 0) return null;

  return mapToObject(results);
}

async function mapToFinishingObject(productId, results) {
  const map = new Map();

  results.forEach((result) => {
    const { optionTypeId } = result;
    const { optionType } = result;
    const { optionId } = result;
    const { name } = result;

    if (!map.has(optionType)) {
      map.set(optionType, { options: [] });
    }

    const options = map.get(optionType);
    const option = {
      optionId,
      name,
      optionTypeId,
    };
    const newOptions = options.options;
    newOptions.push(option);

    map.set(optionType, { options: newOptions, rows: [] });
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const [optionType, value] of map.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const rowQuantityPrices = await getFinishingMatrixRowQuantityPricesForProductIdAndOptionType(productId, optionType);
    const { options } = value;
    const rows = [];
    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      const rowItems = rowQuantityPrices.filter((rq) => rq.optionId === option.optionId);
      const sortedRowItems = rowItems.sort((a, b) => a.quantity - b.quantity);

      rows.push(sortedRowItems);
    }

    map.set(optionType, { options, rows });
  }

  const mapAsObject = Object.fromEntries(map);

  return mapAsObject;
}

async function getFinishingMatrixOptionTypesAndOptionsForProduct(productId) {
  const results = await models.sequelize.query(
    'SELECT distinct ot.id AS optionTypeId, ot.optionType, o.id AS optionId, o.name '
      + ' FROM products p '
      + ' INNER JOIN finishingMatrices fm ON fm.productFk = p.id '
      + ' INNER JOIN finishingMatrixRows fmr ON fmr.finishingMatrixFk = fm.id '
      + ' INNER JOIN options o ON o.id = fmr.optionFk '
      + ' INNER JOIN optionTypes ot ON o.optionTypeFk = ot.id '
      + ' WHERE p.id = :productId '
      + ' and fm.deleteFl = false ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );

  if (results.length === 0) return null;

  return mapToFinishingObject(productId, results);
}

async function getOptionsForOptionTypeId(optionTypeId) {
  return models.option.findAll({
    where: {
      deleteFl: false,
      optionTypeFk: optionTypeId,
    },
  });
}

async function uploadPictures(folder, productName, files) {
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    endpoint: 'https://s3.eu-west-2.amazonaws.com',
  });
  const date = Date.now();
  const s3PathMap = new Map();
  let testDevelopment = '';
  if (env === TEST || env === DEVELOPMENT) {
    testDevelopment = `${env}/`;
  }
  await Promise.all(
    Object.keys(files).map(async (key) => {
      const value = files[key];
      const index = key.replace('Blob', '');
      const blob = value.data;
      const extension = getExtension(value.mimetype);
      const fileName = `picture${index}`;
      const s3Path = `${process.env.S3_BUCKET_PATH}/${testDevelopment}${folder}${productName}/${date}_${encodeURIComponent(
        fileName,
      )}.${extension}`;
      const params = {
        Bucket: process.env.S3_BUCKET,
        Body: blob,
        Key: `${testDevelopment + folder + productName}/${date}_${fileName}.${extension}`,
        ACL: 'public-read',
      };

      const s3UploadPromise = new Upload({
        client: s3,
        params,
      }).done();

      await s3UploadPromise;
      s3PathMap.set(index, s3Path);
    }),
  );

  return s3PathMap;
}

async function createProduct(productDetails, s3PathMap, bulletPoints) {
  const updatedProductDetails = updateProductDetailsWithPicturesAndBulletPoints(s3PathMap, productDetails, bulletPoints);

  const update = updatedProductDetails.status
    ? updatedProductDetails
    : {
      ...updatedProductDetails,
      status: 'Incomplete',
    };
  return models.product.create(update);
}

async function createDefaultProduct(name, productTypeFk, status) {
  return models.product.create({
    name,
    productTypeFk,
    status,
    deleteFl: false,
    versionNo: 1,
  });
}

async function validateProductInformationDetails(productDetails) {
  const errors = {};
  const {
    name, productTypeFk, image1Path, description, subDescriptionTitle, subDescription, descriptionPoint1,
  } = productDetails;

  if (name === null || name === '' || name === undefined) errors.name = "'Product Name' must be set to continue.";

  if (productTypeFk === null || productTypeFk === undefined) {
    errors.productType = "'Product Type' must be set to continue.";
  } else {
    const productType = await getProductTypeById(productTypeFk);
    if (productType === null) errors.productType = "'Product Type' must be set to continue.";
  }

  if (image1Path === undefined || image1Path === null || image1Path === '') errors.picture1 = 'Make sure the main picture has been set to continue.';

  if (description === undefined || description === null || description === '') errors.description = "'Main Product Description'' must be set to continue.";

  if (subDescriptionTitle === undefined || subDescriptionTitle === null || subDescriptionTitle === '') errors.subDescriptionTitle = "'Sub Product Description Title' must be set to continue.";

  if (subDescription === undefined || subDescription === null || subDescription === '') errors.subDescription = "'Sub Product Description' must be set to continue.";

  if (descriptionPoint1 === undefined || descriptionPoint1 === null || descriptionPoint1 === '') errors.descriptionBulletPoint = "'Description Bullet Point' must be set to continue.";

  return errors;
}

async function createPriceMatrixForProduct(productFk, optionTypeGroupFk, status, quantityGroupFk) {
  return models.priceMatrix.create({
    productFk,
    optionTypeGroupFk,
    status,
    quantityGroupFk,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createOptionTypeGroupItems(optionTypeGroupId, optionTypeIds) {
  if (optionTypeIds.length === 0) return;
  let query = 'insert into optionTypeGroupItems (optionTypeGroupFk, optionTypeFk, deleteFl, versionNo) values ';
  optionTypeIds.forEach((id) => {
    query += `(${optionTypeGroupId}, ${id}, false, 1),`;
  });

  query = query.slice(0, -1);

  await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function createPriceMatrix(productId, options, isComplete) {
  // from options list, u have the id
  // from the list of ids get the distinct optionType ids
  // create optiontypegroup
  // then optiontypegroupitems
  const attributeType = await getPrintingAttributeType();
  const optionTypeGroup = await createOptionTypeGroup(productId, attributeType.id);
  const optionsObject = await getOptionsByIds(options);
  const optionTypeIds = new Set();

  optionsObject.forEach((o) => {
    optionTypeIds.add(o.optionTypeFk);
  });

  await createOptionTypeGroupItems(optionTypeGroup.id, optionTypeIds);

  const quantityGroup = await getQuantityGroupForProductId(productId);

  return createPriceMatrixForProduct(
    productId,
    optionTypeGroup.id,
    isComplete ? 'Complete' : 'Incomplete',
    quantityGroup.id,
  );
}

async function createOptionGroupItems(optionGroupId, optionIds) {
  let query = 'insert into optionGroupItems (optionGroupFk, optionFk, deleteFl, versionNo) values ';
  optionIds.forEach((id) => {
    query += `(${optionGroupId}, ${id}, false, 1),`;
  });

  query = query.slice(0, -1);

  await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function createPriceMatrixRowsAndQuantityPrices(priceMatrixId, rows) {
  let orderNo = 1;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    // eslint-disable-next-line no-await-in-loop
    const optionGroup = await createOptionGroup();
    // eslint-disable-next-line no-await-in-loop
    const priceMatrixRow = await createPriceMatrixRow(priceMatrixId, optionGroup.id, orderNo);
    const optionIds = row.optionIdGroup;
    // eslint-disable-next-line no-await-in-loop
    await createOptionGroupItems(optionGroup.id, optionIds);
    const quantities = row.quantityGroup;

    const quantityDetails = quantities.map((q) => ({ id: q.id, price: q.price === '' ? null : q.price }));
    // eslint-disable-next-line no-await-in-loop
    await createPriceMatrixRowQuantityPricesForRow(priceMatrixRow.id, quantityDetails);

    orderNo += 1;
  }
}

async function getAllProductWithLowestPriceDetails() {
  return models.sequelize.query(
    ' select distinct pq.price, pt.productType, p.* from priceMatrixRowQuantityPrices pq '
      + ' inner join priceMatrixRows pr on pq.priceMatrixRowFk = pr.id '
      + ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id '
      + ' inner join products p on pm.productFk = p.id '
      + ' inner join productTypes pt on p.productTypeFk = pt.id '
      + ' where pq.id = ( '
      + ' select pq2.id from priceMatrixRowQuantityPrices pq2 '
      + ' inner join priceMatrixRows pr2 on pq2.priceMatrixRowFk = pr2.id '
      + ' inner join priceMatrices pm2 on pr2.priceMatrixFk = pm2.id '
      + ' where pm2.productFk = p.id '
      + ' and pm2.deleteFl = false '
      + ' order by pq2.price asc limit 1 ) '
      + ' and pm.deleteFl = false ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function parseOptionTypesAndOption(optionTypesAndOptions) {
  const optionTypeIds = new Set();
  const parsedOptionTypesAndOptions = [];

  Object.keys(optionTypesAndOptions).forEach((key) => {
    const optionTypeAndOption = optionTypesAndOptions[key];
    const typeIds = optionTypeAndOption.map((o) => o.optionTypeId);
    typeIds.forEach((typeId) => {
      optionTypeIds.add(typeId);
    });
  });

  optionTypeIds.forEach((optionTypeId) => {
    Object.keys(optionTypesAndOptions).forEach((key) => {
      const optionTypeAndOption = optionTypesAndOptions[key];

      const items = optionTypeAndOption
        .filter((o) => o.optionTypeId === optionTypeId)
        .map((o2) => ({ name: o2.name, optionId: o2.optionId }));
      parsedOptionTypesAndOptions.push({ optionTypeId, options: items });
    });
  });

  return parsedOptionTypesAndOptions;
}

async function handleAddingOptionTypesForPricingJson(optionTypeAndOption) {
  const { optionTypeId } = optionTypeAndOption[0];
  const selectedOptionNames = optionTypeAndOption.map((o1) => o1.name).join(', ');
  const allOptions = await getOptionsForOptionTypeId(optionTypeId);

  return optionTypeAndOption.map((o) => ({
    ...o,
    selectedOptionNames,
    allOptions,
  }));
}

async function addAllOptionTypesToOptionTypesAndOptionJson(optionTypesAndOptions) {
  if (optionTypesAndOptions) {
    const result = new Map();
    await Promise.all(
      Object.keys(optionTypesAndOptions).map(async (key) => {
        result[key] = await handleAddingOptionTypesForPricingJson(optionTypesAndOptions[key]);
      }),
    );

    return result;
  }

  return optionTypesAndOptions;
}

async function handleAddingOptionTypesForFinishingJson(optionTypeAndOption) {
  const { optionTypeId } = optionTypeAndOption.options[0];
  const selectedOptionNames = optionTypeAndOption.options.map((o1) => o1.name).join(', ');
  const allOptions = await getOptionsForOptionTypeId(optionTypeId);

  const modifiedOptions = optionTypeAndOption.options.map((o) => ({
    ...o,
    selectedOptionNames,
    allOptions,
  }));

  return {
    ...optionTypeAndOption,
    options: modifiedOptions,
  };
}

async function addAllOptionTypesToOptionTypesAndOptionToFinishingJson(optionTypesAndOptions) {
  if (optionTypesAndOptions) {
    const result = new Map();
    await Promise.all(
      Object.keys(optionTypesAndOptions).map(async (key) => {
        result[key] = await handleAddingOptionTypesForFinishingJson(optionTypesAndOptions[key]);
      }),
    );

    return result;
  }

  return optionTypesAndOptions;
}

async function getSelectedQuantitiesForProductById(productId) {
  const result = await models.sequelize.query(
    'select distinct q.id, q.quantity from quantityGroupItems qi '
      + ' inner join quantities q on qi.quantityFk = q.id '
      + ' inner join quantityGroups qg on qi.quantityGroupFk = qg.id '
      + ' where qg.productFk = :productId '
      + ' order by q.quantity asc ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result;
}

async function getPriceMatrixForProductId(productId) {
  return models.priceMatrix.findOne({
    where: {
      productFk: productId,
      deleteFl: false,
    },
  });
}

async function getPriceMatrixDetailsForProductId(productId) {
  const result = await models.sequelize.query(
    'select distinct q.quantity, pmr.*,pq.*, pq.id as priceMatrixRowQuantityPriceId from priceMatrixRows pmr '
      + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
      + ' inner join priceMatrixRowQuantityPrices pq on pq.priceMatrixRowFk = pmr.id '
      + ' inner join quantities q on pq.quantityFk = q.id '
      + ' inner join optionGroupItems ogi on ogi.optionGroupFk = pmr.optionGroupFk '
      + ' where pm.productFk = :productId '
      + ' and pm.deleteFl = false order by pmr.orderNo asc',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );

  return getRowDetails(result);
}

async function getOptionGroupItemsByOptionGroupId(id) {
  return models.optionGroupItem.findAll({
    where: {
      optionGroupFk: id,
    },
  });
}

async function updateProduct(productDetails) {
  const data = {
    name: productDetails.name,
    productTypeFk: productDetails.productTypeFk,
    description: productDetails.description,
    subDescriptionTitle: productDetails.subDescriptionTitle,
    subDescription: productDetails.subDescription,
    versionNo: models.sequelize.literal('versionNo + 1'),
  };

  const { s3PathMap } = productDetails;
  s3PathMap.forEach((value, path) => {
    data[`image${path}Path`] = value;
  });

  const { bulletPoints } = productDetails;
  const numberOfPoints = bulletPoints.length;
  for (let i = 0; i < 6; i += 1) {
    if (i < numberOfPoints) {
      const bulletPoint = bulletPoints[i];
      const trimmed = bulletPoint.replace(/\s+$/, '');
      if (trimmed !== '') {
        data[`descriptionPoint${i + 1}`] = bulletPoint;
      } else {
        data[`descriptionPoint${i + 1}`] = null;
      }
    } else {
      data[`descriptionPoint${i + 1}`] = null;
    }
  }

  // data['status'] = await isV ? 'Complete' : 'Incomplete';

  await models.product.update(data, {
    where: {
      id: productDetails.productId,
    },
  });
}

async function updatePriceMatrixRowQuantityPriceById(id, price) {
  await models.priceMatrixRowQuantityPrice.update(
    {
      price,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id,
      },
    },
  );
}

async function updatePriceMatrixRowPrices(rows) {
  rows.forEach((row) => {
    const { quantityGroup } = row;

    quantityGroup.forEach(async (item) => {
      const { priceMatrixRowQuantityPriceId } = item;
      await updatePriceMatrixRowQuantityPriceById(priceMatrixRowQuantityPriceId, item.price);
    });
  });
}

async function getAllProductTypesWithNumberOfProducts() {
  return models.sequelize.query(
    'SELECT pt.id, pt.productType, COUNT(p.id) as numberOfProducts, pt.deleteFl '
      + ' FROM productTypes pt '
      + ' LEFT JOIN products p ON pt.id = p.productTypeFk '
      + ' GROUP BY pt.id, pt.productType ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function updateProductType(productTypeDetails) {
  await models.productType.update(
    {
      productType: productTypeDetails.productTypeName,
      bannerPath: productTypeDetails.bannerPath,
      deleteFl: productTypeDetails.deleteFl,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: productTypeDetails.productTypeId,
      },
    },
  );
}

async function createProductType(productTypeDetails) {
  return models.productType.create({
    productType: productTypeDetails.productType,
    bannerPath: productTypeDetails.bannerPath,
    deleteFl: productTypeDetails.deleteFl,
    versionNo: 1,
  });
}

async function getActiveProductsForProductTypeName(productTypeName) {
  return models.sequelize.query(
    'select p.* from productTypes pt '
      + ' inner join products p on p.productTypeFk = pt.id '
      + ' where pt.productType = :productTypeName '
      + ' and p.deleteFl = false ',
    {
      replacements: { productTypeName },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getQuantitiesForProduct(productId) {
  return models.sequelize.query(
    'select q.* from products p '
      + ' inner join quantityGroups qg on qg.productFk = p.id '
      + ' inner join quantityGroupItems qgi on qgi.quantityGroupFk = qg.id '
      + ' inner join quantities q on qgi.quantityFk = q.id '
      + ' where p.id = :productId '
      + ' order by q.quantity asc',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionGroupById(id) {
  return models.optionGroup.findOne({
    where: {
      id,
    },
  });
}

async function searchProductTypesByName(search) {
  return models.sequelize.query(
    "select concat('/shop?type=', productType) as link, productType as name from productTypes "
      + ' where productType like :search ',
    {
      replacements: { search: `%${search}%` },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function searchProductsByName(search) {
  return models.sequelize.query("select concat('/shop/', name) as link, name from products where name like :search ", {
    replacements: { search: `%${search}%` },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getOptionTypeById(id) {
  return models.optionType.findOne({
    where: {
      id,
    },
  });
}

async function getOptionById(id) {
  return models.option.findOne({
    where: {
      id,
      deleteFl: false,
    },
  });
}

async function getOptionByName(name) {
  return models.option.findOne({
    where: {
      name,
      deleteFl: false,
    },
  });
}

async function getOptionByNameAndType(name, optionTypeId) {
  return models.option.findOne({
    where: {
      name,
      optionTypeFk: optionTypeId,
      deleteFl: false,
    },
  });
}

async function createOption(name, optionTypeId) {
  return models.option.create({
    name,
    optionTypeFk: optionTypeId,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getOptionTypeByName(optionType) {
  return models.optionType.findOne({
    where: {
      optionType,
    },
  });
}

async function createOptionType(optionType) {
  return models.optionType.create({
    optionType,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getNavigationBarHeaders() {
  return models.navigationBar.findOne({
    where: {
      deleteFl: false,
    },
  });
}

async function updateNavigationBarHeaders(ids) {
  await models.navigationBar.update(
    {
      productTypeFk1: ids[0] === 0 ? null : ids[0],
      productTypeFk2: ids[1] === 0 ? null : ids[1],
      productTypeFk3: ids[2] === 0 ? null : ids[2],
      productTypeFk4: ids[3] === 0 ? null : ids[3],
      productTypeFk5: ids[4] === 0 ? null : ids[4],
      productTypeFk6: ids[5] === 0 ? null : ids[5],
      productTypeFk7: ids[6] === 0 ? null : ids[6],
      productTypeFk8: ids[7] === 0 ? null : ids[7],
      productTypeFk9: ids[8] === 0 ? null : ids[8],
      productTypeFk10: ids[9] === 0 ? null : ids[9],
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: 1,
      },
    },
  );
}

async function getThe10NavigationHeaders(index, result, navigationBarHeaders) {
  if (index <= 10) {
    const productTypeId = navigationBarHeaders[`productTypeFk${index}`];

    // Make the next async call with the incremented index

    if (productTypeId !== null) {
      const productType = await getProductTypeById(productTypeId);
      const products = await getAllProductsByProductTypeId(productTypeId);
      result.push({ name: productType.productType, products });
    }

    await getThe10NavigationHeaders(index + 1, result, navigationBarHeaders);
  }
}

async function getNavigationBarHeadersAndProducts() {
  const navigationBarHeaders = await models.navigationBar.findOne({
    where: {
      deleteFl: false,
    },
  });

  const result = [];

  await getThe10NavigationHeaders(1, result, navigationBarHeaders);

  return result;
}

async function getHomePageBannerSection() {
  return models.homePageBannerSection.findOne({
    where: {
      id: 1,
    },
  });
}

async function createHomePageBannerSection(title, productTypeId, description, path) {
  return models.homePageBannerSection.create({
    id: 1,
    title,
    productTypeFk: productTypeId,
    description,
    imagePath: path,
    deleteFl: false,
    versionNo: 1,
  });
}

async function updateHomePageBannerSection(data) {
  await models.homePageBannerSection.update(data, {
    where: {
      id: 1,
    },
  });
}

async function getHomePageMainBannerSection() {
  return models.homePageMainBannerSection.findOne({
    where: {
      id: 1,
    },
  });
}

async function createHomePageMainBannerSection(title, buttonText, description, path) {
  return models.homePageMainBannerSection.create({
    id: 1,
    title,
    buttonText,
    description,
    imagePath: path,
    deleteFl: false,
    versionNo: 1,
  });
}

async function updateHomePageMainBannerSection(data) {
  await models.homePageMainBannerSection.update(data, {
    where: {
      id: 1,
    },
  });
}

async function getTemplatesForSizeOptions(options) {
  return models.sequelize.query(
    'select t.*, o.name from templates t '
      + ' inner join options o on t.sizeOptionFk = o.id '
      + ' where t.deleteFl = false '
      + ' and t.sizeOptionFk in (:options) ',
    { replacements: { options }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getTemplates() {
  return models.sequelize.query('select t.*, o.name from templates t inner join options o on t.sizeOptionFk = o.id ', {
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getTemplate(id) {
  const result = await models.sequelize.query(
    'select t.*, o.name from templates t  inner join options o on t.sizeOptionFk = o.id where t.id = :id',
    { replacements: { id }, type: models.sequelize.QueryTypes.SELECT },
  );
  return result.length === 0 ? null : result[0];
}

async function getAvailableSizeOptionsForNewTemplate() {
  return models.sequelize.query(
    'select * from options o  where o.id not in (select sizeOptionFk from templates) and o.optionTypeFk = 1 ',
    { type: models.sequelize.QueryTypes.SELECT },
  );
}

async function createTemplate(body) {
  return models.template.create(body);
}

async function updateTemplate(id, body) {
  await models.template.update(body, {
    where: {
      id,
    },
  });
}

async function isProductInformationDetailsComplete(details) {
  const {
    name, productTypeFk, image1Path, description, subDescriptionTitle, subDescription, descriptionPoint1,
  } = details;

  if (name === null || name === '') return false;

  const productType = await getProductTypeById(productTypeFk);
  if (productType === null) return false;

  if (image1Path === undefined || image1Path === null || image1Path === '') return false;

  if (description === undefined || description === null || description === '') return false;

  if (subDescriptionTitle === undefined || subDescriptionTitle === null || subDescriptionTitle === '') return false;

  if (subDescription === undefined || subDescription === null || subDescription === '') return false;

  if (descriptionPoint1 === undefined || descriptionPoint1 === null || descriptionPoint1 === '') return false;

  return true;
}

async function verifyQuantities(productId, quantities) {
  const quantityGroup = await getQuantityGroupForProductId(productId);
  if (!quantityGroup) {
    return {
      valid: true,
      warning: false,
      message: false,
      create: true,
    };
  }

  const exisitingQuantities = await getSelectedQuantitiesForProductById(productId);
  const existingQuantityIds = exisitingQuantities.map((q) => q.id.toString());
  const quantitiesTheSame = hasTheSameItems(quantities, existingQuantityIds);

  if (quantitiesTheSame) {
    return { valid: false, warning: false, message: 'No changes made.' };
  }

  const priceMatrix = await getPriceMatrixForProductId(productId);

  return {
    valid: true,
    create: false,
    warning: !!priceMatrix,
    message: priceMatrix
      ? "Are you sure you wish to make this change? \nMaking this change will alter the existing 'Price' and 'Finishing' matrices and existing prices will be lost."
      : null,
  };
  // check whether price matrix exists for product
  // TODO
  // check whether finishing matrix exists also
}

async function setQuantitiesForQuantityGroup(quantityGroup, quantities) {
  if (quantities.length === 0) return;
  let query = 'insert into quantityGroupItems (quantityGroupFk, quantityFk, deleteFl, versionNo) values ';

  quantities.forEach((quantityId) => {
    query += `(${quantityGroup.id}, ${quantityId}, false, 1),`;
  });

  query = query.slice(0, -1);
  await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT });
}

async function removeAllQuantitesFromQuantityGroup(quantityGroup) {
  await models.sequelize.query('delete from quantityGroupItems where quantityGroupFk = :id', {
    replacements: { id: quantityGroup.id },
    type: models.sequelize.QueryTypes.DELETE,
  });
}

async function getQuantitiesForQuantityGroup(quantityGroupId) {
  return models.sequelize.query(
    'select q.* from quantities q '
      + ' inner join quantityGroupItems qgi on qgi.quantityFk = q.id '
      + ' where qgi.quantityGroupFk = :id ',
    {
      replacements: { id: quantityGroupId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getPriceMatrixRowsForQuantityGroup(quantityGroupId) {
  return models.sequelize.query(
    'select pmr.* from priceMatrices pm '
      + ' inner join quantityGroups qg on pm.quantityGroupFk = qg.id '
      + ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id '
      + ' where pm.deleteFl = false '
      + ' and pmr.deleteFl = false '
      + ' and qg.id = :id ',
    {
      replacements: { id: quantityGroupId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function getFinishingMatrixRowsForQuantityGroup(quantityGroupId) {
  return models.sequelize.query(
    'select fmr.* from finishingMatrices fm '
      + ' inner join quantityGroups qg on fm.quantityGroupFk = qg.id '
      + ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id '
      + ' where fm.deleteFl = false '
      + ' and fmr.deleteFl = false '
      + ' and qg.id = :id ',
    {
      replacements: { id: quantityGroupId },
      type: models.sequelize.QueryTypes.SELECT,
    },
  );
}

async function updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroupId, removedQuantities, addQuantities) {
  if (removedQuantities.length > 0) {
    await models.sequelize.query(
      ' delete pq1 from priceMatrixRowQuantityPrices as pq1 '
        + ' inner join priceMatrixRowQuantityPrices as pq2 on pq1.id = pq2.id '
        + ' inner join priceMatrixRows pmr on pq2.priceMatrixRowFk = pmr.id '
        + ' inner join priceMatrices pm on pmr.priceMatrixFk = pm.id '
        + ' where pm.quantityGroupFk = :id '
        + ' and pm.deleteFl = false '
        + ' and pmr.deleteFl = false '
        + ' and pq2.deleteFl = false '
        + ' and pq2.quantityFk in (:removedQuantities)',
      {
        replacements: { id: quantityGroupId, removedQuantities },
        type: models.sequelize.QueryTypes.DELETE,
      },
    );
  }

  // get pricematrix rows not deleted
  const priceMatrixRows = await getPriceMatrixRowsForQuantityGroup(quantityGroupId);

  const promises = [];

  for (let i = 0; i < priceMatrixRows.length; i += 1) {
    const priceMatrixRow = priceMatrixRows[i];
    const addQuantityDetails = addQuantities.map((q) => ({ id: q, price: null }));
    promises.push(createPriceMatrixRowQuantityPricesForRow(priceMatrixRow.id, addQuantityDetails));
  }
  await Promise.all(promises);
}

async function updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroupId, removedQuantities, addQuantities) {
  if (removedQuantities.length > 0) {
    await models.sequelize.query(
      ' delete fq1 from finishingMatrixRowQuantityPrices as fq1 '
        + ' inner join finishingMatrixRowQuantityPrices as fq2 on fq1.id = fq2.id '
        + ' inner join finishingMatrixRows fmr on fq2.finishingMatrixRowFk = fmr.id '
        + ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id '
        + ' where fm.quantityGroupFk = :id '
        + ' and fm.deleteFl = false '
        + ' and fmr.deleteFl = false '
        + ' and fq2.deleteFl = false '
        + ' and fq2.quantityFk in (:removedQuantities)',
      {
        replacements: { id: quantityGroupId, removedQuantities },
        type: models.sequelize.QueryTypes.DELETE,
      },
    );
  }
  const finishingMatrixRows = await getFinishingMatrixRowsForQuantityGroup(quantityGroupId);

  const promises = [];
  for (let i = 0; i < finishingMatrixRows.length; i += 1) {
    const finishingMatrixRow = finishingMatrixRows[i];
    for (let j = 0; j < addQuantities.length; j += 1) {
      const addQuantity = addQuantities[j];

      promises.push(createFinishingMatrixRowQuantityPrice(finishingMatrixRow.id, addQuantity, null));
    }
  }
  await Promise.all(promises);
}

async function updateQuantitiesForQuantityGroup(quantityGroup, quantities) {
  const existingQuantities = await getQuantitiesForQuantityGroup(quantityGroup.id);
  const existingQuantityIds = existingQuantities.map((q) => q.id.toString());
  const remove = [];
  const add = [];

  existingQuantityIds.forEach((existingQuantityId) => {
    if (!quantities.includes(existingQuantityId)) remove.push(existingQuantityId);
  });

  quantities.forEach((quantity) => {
    if (!existingQuantityIds.includes(quantity)) add.push(quantity);
  });

  await removeAllQuantitesFromQuantityGroup(quantityGroup);

  await setQuantitiesForQuantityGroup(quantityGroup, quantities);

  await updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroup.id, remove, add);
  await updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroup.id, remove, add);
  // update pricematrixrowquantityprices
  // update finisingmatrices
}

async function createQuantityGroupAndSetQuantities(productId, quantities) {
  const quantityGroup = await createQuantityGroup(productId);
  await setQuantitiesForQuantityGroup(quantityGroup, quantities);
  return quantityGroup;
}

async function createPrintingAttributes(productId, options, rows) {
  const isComplete = await isMatrixDetailsComplete(rows);
  const priceMatrix = await createPriceMatrix(productId, options, isComplete);
  await createPriceMatrixRowsAndQuantityPrices(priceMatrix.id, rows);
  return priceMatrix;
}

async function deletePriceMatrix(productFk) {
  await models.priceMatrix.update(
    {
      deleteFl: true,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        productFk,
        deleteFl: false,
      },
    },
  );
}

async function deletePriceMatrixForProduct(productId) {
  await deletePriceMatrixRowQuantityPricesForPriceMatrixRow(productId);
  await deleteOptionGroupItemsForProduct(productId);
  await deletePriceMatrixRowsForProduct(productId);
  await deleteOptionGroupsForPriceMatrix(productId);
  await deleteOptionTypeGroupAndItemsForProductId(productId, 'Printing');
  await deletePriceMatrix(productId);
}

async function getFinishingMatrixRowsForMatrix(matrixId) {
  const result = await models.sequelize.query(
    'select distinct o.id as optionId, q.quantity, fmr.*, fq.*, fq.id as finishingMatrixRowQuantityPriceId from finishingMatrixRows fmr '
      + ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id '
      + ' inner join finishingMatrixRowQuantityPrices fq on fq.finishingMatrixRowFk = fmr.id '
      + ' inner join quantities q on fq.quantityFk = q.id '
      + ' inner join options o on o.id = fmr.optionFk '
      + ' where fm.id = :matrixId '
      + ' and fm.deleteFl = false order by fmr.orderNo asc',
    { replacements: { matrixId }, type: models.sequelize.QueryTypes.SELECT },
  );

  return result;
}

async function getFinishingMatrixDetail(finishingMatrix, result) {
  const finishingMatrixRows = await getFinishingMatrixRowsForMatrix(finishingMatrix.id);

  const matrixDetails = {
    id: finishingMatrix.id,
    rows: finishingMatrixRows,
  };

  result.push(matrixDetails);
}

async function getFinishingMatricesDetailsForProductId(productId) {
  const finishingMatrices = await getFinishingMatricesForProductId(productId);
  const result = [];

  await Promise.all(finishingMatrices.map((finishingMatrix) => getFinishingMatrixDetail(finishingMatrix, result)));

  return result;
}

async function createFinishingMatrix(productId, optionTypeId, orderNo, isComplete) {
  const quantityGroup = await getQuantityGroupForProductId(productId);
  return models.finishingMatrix.create({
    productFk: productId,
    orderNo,
    status: isComplete ? 'Complete' : 'Incomplete',
    optionTypeFk: optionTypeId,
    quantityGroupFk: quantityGroup.id,
    deleteFl: false,
    versionNo: 1,
  });
}

async function getOptionTypeFromOptionId(optionId) {
  const optionTypes = await models.sequelize.query(
    'select ot.* from options o inner join optionTypes ot on o.optionTypeFk = ot.id where o.id = :id ',
    { replacements: { id: optionId }, type: models.sequelize.QueryTypes.SELECT },
  );

  if (optionTypes.length === 0) return null;

  return optionTypes[0];
}

async function createFinishingMatrixRow(finishingMatrixId, optionId, orderNo) {
  return models.finishingMatrixRow.create({
    finishingMatrixFk: finishingMatrixId,
    optionFk: optionId,
    orderNo,
    deleteFl: false,
    versionNo: 1,
  });
}

async function createFinishingMatrices(productId, matrices) {
  for (let i = 0; i < matrices.length; i += 1) {
    const matrix = matrices[i];
    // eslint-disable-next-line no-await-in-loop
    const isComplete = await isMatrixDetailsComplete(matrix);
    // eslint-disable-next-line no-await-in-loop
    const optionType = await getOptionTypeFromOptionId(matrix[0].optionId[0]);
    // eslint-disable-next-line no-await-in-loop
    const finishingMatrix = await createFinishingMatrix(productId, optionType.id, i + 1, isComplete);
    for (let j = 0; j < matrix.length; j += 1) {
      const row = matrix[j];
      const { quantityGroup } = row;
      const optionId = row.optionId[0];
      // eslint-disable-next-line no-await-in-loop
      const finishingMatrixRow = await createFinishingMatrixRow(finishingMatrix.id, optionId, j + 1);

      const quantityDetails = quantityGroup.map((q) => ({ id: q.id, price: q.price === '' ? null : q.price }));
      // eslint-disable-next-line no-await-in-loop
      await createFinishingMatrixRowQuantityPrices(finishingMatrixRow.id, quantityDetails);
    }
  }
}

async function deleteFinishingMatricesRowQuantitiesForProductId(productId) {
  await models.sequelize.query(
    'update finishingMatrixRowQuantityPrices as fq1 '
      + ' inner join finishingMatrixRowQuantityPrices as fq2 on fq1.id = fq2.id '
      + ' inner join finishingMatrixRows fmr on fq2.finishingMatrixRowFk = fmr.id '
      + ' inner join finishingMatrices fm on fmr.finishingMatrixFk = fm.id '
      + ' inner join products p on fm.productFk = p.id '
      + ' set fq1.deleteFl = true, fq1.versionNo = fq1.versionNo + 1 '
      + ' where fm.deleteFl = false '
      + ' and fq2.deleteFl =  false '
      + ' and fmr.deleteFl = false '
      + ' and p.id = :productId ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deleteFinishingMatricesRowsForProductId(productId) {
  await models.sequelize.query(
    'update finishingMatrixRows as fmr1 '
      + ' inner join finishingMatrixRows as fmr2 on fmr1.id = fmr2.id '
      + ' inner join finishingMatrices fm on fmr2.finishingMatrixFk = fm.id '
      + ' inner join products p on fm.productFk = p.id '
      + ' set fmr1.deleteFl = true, fmr1.versionNo = fmr1.versionNo + 1 '
      + ' where fm.deleteFl = false '
      + ' and fmr2.deleteFl = false '
      + ' and p.id = :productId ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deleteFinishingMatricesForProductId(productId) {
  await models.sequelize.query(
    'update finishingMatrices as fm1 '
      + ' inner join finishingMatrices as fm2 on fm1.id = fm2.id '
      + ' set fm1.deleteFl = true, fm1.versionNo = fm1.versionNo + 1 '
      + ' where fm2.productFk = :productId '
      + ' and fm2.deleteFl = false ',
    { replacements: { productId }, type: models.sequelize.QueryTypes.UPDATE },
  );
}

async function deleteFinishingMatricesForProduct(productId) {
  const transaction = await models.sequelize.transaction();
  try {
    await deleteFinishingMatricesRowQuantitiesForProductId(productId);
    await deleteFinishingMatricesRowsForProductId(productId);
    await deleteFinishingMatricesForProductId(productId);
    await transaction.commit();
  } catch (err) {
    logger.error(err);
    await transaction.rollback();
  }
}

async function isAllFinishingMatricesComplete(matrices) {
  const isCompletedArray = await Promise.all(matrices.map((matrix) => isMatrixDetailsComplete(matrix)));
  return !isCompletedArray.includes(false);
}

async function isProductValid(product) {
  const errors = await validateProductInformationDetails(product);
  if (!isEmpty(errors)) return { isValid: false, page: 'page1' };

  const quantityGroup = await getQuantityGroupForProductId(product.id);
  if (!quantityGroup) return { isValid: false, page: 'page2' };

  const priceMatrix = await getPriceMatrixForProductId(product.id);
  if (!priceMatrix) return { isValid: false, page: 'page3' };

  if (priceMatrix.status === 'Incomplete') return { isValid: false, page: 'page3' };

  const finishingMatrices = await getFinishingMatricesForProductId(product.id);

  const incompleteMatrices = finishingMatrices.filter((f) => f.status === 'Incomplete');
  if (incompleteMatrices.length > 0) return { isValid: false, page: 'page4' };

  const productDeliveries = await getProductDeliveriesForProduct(product.id);
  if (productDeliveries.length === 0) return { isValid: false, page: 'page5' };

  // discounts
  return { isValid: true };
}

async function deactivateProduct(productId, isComplete) {
  await models.product.update(
    {
      deleteFl: true,
      status: isComplete ? 'Complete' : 'Incomplete',
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: productId,
      },
    },
  );
}

async function activateProduct(productId) {
  await models.product.update(
    {
      deleteFl: false,
      versionNo: models.sequelize.literal('versionNo + 1'),
      status: 'Complete',
    },
    {
      where: {
        id: productId,
      },
    },
  );
}

async function setProductStatusComplete(productId, isComplete) {
  const data = {
    versionNo: models.sequelize.literal('versionNo + 1'),
    status: isComplete ? 'Complete' : 'Incomplete',
  };

  if (!isComplete) {
    data.deleteFl = true;
  }
  await models.product.update(data, {
    where: {
      id: productId,
    },
  });
}

function getDistinctProductDetails(list) {
  const seen = new Map();
  const distinctObjects = [];

  list.forEach((obj) => {
    const key = `${obj.productId}|${obj.name}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      distinctObjects.push({ productId: obj.productId, name: obj.name });
    }
  });

  return distinctObjects;
}

async function getProductsWhereFinishingAttributeUsesOptionId(id) {
  const result = await models.sequelize.query(
    'select fmr.*, p.name, p.id as productId from finishingMatrices fm '
      + ' inner join finishingMatrixRows fmr on fmr.finishingMatrixFk = fm.id '
      + ' inner join products p on fm.productFk = p.id '
      + ' where fm.deleteFl = false '
      + ' and fmr.optionFk = :optionId',
    { replacements: { optionId: id }, type: models.sequelize.QueryTypes.SELECT },
  );

  const products = getDistinctProductDetails(result);

  const finishingMatrixRowIds = result.map((r) => r.id);

  return { products, finishingMatrixRowIds };
}

async function getProductsWherePrintingAttributeUsesOptionId(id) {
  const result = await models.sequelize.query(
    'select pmr.*,  ogi.id as optionGroupItemId ,p.name, p.id as productId from priceMatrices pm '
      + ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id '
      + ' inner join optionGroupItems ogi on pmr.optionGroupFk = ogi.optionGroupFk '
      + ' inner join products p on pm.productFk = p.id '
      + ' where pm.deleteFl = false '
      + ' and ogi.optionFk = :optionId ',
    { replacements: { optionId: id }, type: models.sequelize.QueryTypes.SELECT },
  );

  const products = getDistinctProductDetails(result);

  const optionGroupItemIds = result.map((r) => r.optionGroupItemId);

  return { products, optionGroupItemIds };
}

async function getProductsWhichCurrentlyUseOptionId(id) {
  const productsWithFinishingOption = await getProductsWhereFinishingAttributeUsesOptionId(id);
  const productsWithPrintingOption = await getProductsWherePrintingAttributeUsesOptionId(id);

  // const products = [...productsWithFinishingOption.products, ...productsWithPrintingOption.products];

  return {
    productsWithFinishingOption: productsWithFinishingOption.products,
    productsWithPrintingOption: productsWithPrintingOption.products,
    optionGroupItemIds: productsWithPrintingOption.optionGroupItemIds,
    finishingMatrixRowIds: productsWithFinishingOption.finishingMatrixRowIds,
  };
}

async function updateOptionForOptionGroupItems(optionGroupItemIds, optionId) {
  await models.optionGroupItem.update(
    {
      optionFk: optionId,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: { [Sequelize.Op.in]: optionGroupItemIds },
      },
    },
  );
}

async function updateOptionForFinishingMatrixRows(finishingMatrixRowIds, optionId) {
  await models.finishingMatrixRow.update(
    {
      optionFk: optionId,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: { [Sequelize.Op.in]: finishingMatrixRowIds },
      },
    },
  );
}

async function updateOptionForTemplates(templateIds, optionId) {
  await models.template.update(
    {
      optionFk: optionId,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id: { [Sequelize.Op.in]: templateIds },
      },
    },
  );
}

async function deleteOption(id) {
  await models.option.update(
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

async function getQuantityByName(quantity) {
  return models.quantity.findOne({
    where: {
      quantity,
    },
  });
}

async function createQuantity(quantity) {
  let quantityObject = await getQuantityByName(quantity);

  if (!quantityObject) {
    quantityObject = await models.quantity.create({
      quantity,
      deleteFl: false,
      versionNo: 1,
    });
  }

  return quantityObject;
}

async function getAllProductTypesNotInList(ids) {
  return models.productType.findAll({
    where: {
      deleteFl: false,
      id: { [Sequelize.Op.notIn]: ids },
    },
    order: [['productType', 'ASC']],
  });
}

async function getPriceMatrixRowQuantityPriceForRow(priceMatrixRowFk) {
  return models.priceMatrixRowQuantityPrice.findAll({
    where: {
      priceMatrixRowFk,
    },
  });
}

async function getPriceMatrixRowQuantityPricesForMatrix(priceMatrixFk) {
  return models.sequelize.query(
    'select pq.* from priceMatrixRowQuantityPrices pq '
      + ' inner join priceMatrixRows pr on pq.priceMatrixRowFk = pr.id '
      + ' inner join priceMatrices pm on pr.priceMatrixFk = pm.id '
      + ' where pm.id = :priceMatrixFk',
    { replacements: { priceMatrixFk }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionGroupItemsForPriceMatrix(priceMatrixId) {
  return models.sequelize.query(
    'select ogi.* from priceMatrices pm '
      + ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id '
      + ' inner join optionGroupItems ogi on pmr.optionGroupFk = ogi.optionGroupFk '
      + ' where pm.id = :priceMatrixId ',
    { replacements: { priceMatrixId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getPriceMatrixRowsForMatrix(priceMatrixFk) {
  return models.priceMatrixRow.findAll({
    where: {
      priceMatrixFk,
    },
  });
}

async function getOptionGroupsForMatrix(priceMatrixId) {
  return models.sequelize.query(
    'select og.* from priceMatrices pm '
      + ' inner join priceMatrixRows pmr on pmr.priceMatrixFk = pm.id '
      + ' inner join optionGroups og on pmr.optionGroupFk = og.id '
      + ' where pm.id = :priceMatrixId',
    { replacements: { priceMatrixId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionTypeGroupItemsForProduct(productId) {
  return models.sequelize.query(
    'select otg.* from optionTypeGroupItems otgi '
    + ' inner join optionTypeGroups otg on otgi.optionTypeGroupFk = otg.id '
    + ' inner join products p on otg.productFk = :productId',
    { replacements: { productId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getOptionTypeGroupsForProduct(productFk) {
  return models.optionTypeGroup.findAll({
    where: {
      productFk,
    },
  });
}

async function getFinishingMatrixRowQuantityPrices(finishingMatrixId) {
  return models.sequelize.query(
    'select * from finishingMatrixRowQuantityPrices fq '
      + ' inner join finishingMatrixRows fr on fq.finishingMatrixRowFk = fr.id '
      + ' where fr.finishingMatrixFk = :finishingMatrixId',
    { replacements: { finishingMatrixId }, type: models.sequelize.QueryTypes.SELECT },
  );
}

async function getFinishingMatrixById(id) {
  return models.finishingMatrix.findOne({
    where: {
      id,
    },
  });
}

async function getFinishingMatrixRowsForFinishingMatrix(finishingMatrixFk) {
  return models.finishingMatrixRow.findAll({
    where: {
      finishingMatrixFk,
    },
  });
}

module.exports = {
  getQuantityByName,
  createQuantity,
  deleteOption,
  updateOptionForTemplates,
  updateOptionForFinishingMatrixRows,
  updateOptionForOptionGroupItems,
  getProductsWhichCurrentlyUseOptionId,
  createPrintingAttributes,
  parseOptionTypesAndOption,
  getAllProductWithLowestPriceDetails,
  createPriceMatrixRowsAndQuantityPrices,
  createPriceMatrix,
  createProduct,
  uploadPictures,
  getOptionsForOptionTypeId,
  getPricingMatrixOptionTypesAndOptionsForProduct,
  getQuantityPriceTable,
  getAllQuantities,
  getAllOptionTypes,
  getLowestPriceWithQuantityForProductByProductId,
  getAllProductsByProductTypeId,
  getProductById,
  getProductByProductName,
  getAllProducts,
  getAllActiveProducts,
  getActiveProductTypeById,
  getProductTypeByType,
  getAllProductTypes,
  getAllActiveProductTypes,
  addAllOptionTypesToOptionTypesAndOptionJson,
  getSelectedQuantitiesForProductById,
  getPriceMatrixDetailsForProductId,
  updateProduct,
  updatePriceMatrixRowPrices,
  deletePriceMatrixForProduct,
  getAllProductTypesWithNumberOfProducts,
  updateProductType,
  getProductTypeById,
  getActiveProductsForProductTypeName,
  createOptionGroup,
  createOptionGroupItem,
  getOptionGroupItemsForOptionGroup,
  getQuantitiesForProduct,
  getOptionGroupById,
  getOptionGroupItemsByOptionGroupId,
  searchProductTypesByName,
  searchProductsByName,
  getOptionTypeById,
  getOptionByName,
  createOption,
  getAllOptionTypesWithOptions,
  getOptionTypeByName,
  createOptionType,
  getOptionByNameAndType,
  getNavigationBarHeaders,
  updateNavigationBarHeaders,
  getNavigationBarHeadersAndProducts,
  createProductType,
  getHomePageBannerSection,
  createHomePageBannerSection,
  updateHomePageBannerSection,
  getHomePageMainBannerSection,
  createHomePageMainBannerSection,
  updateHomePageMainBannerSection,
  getTemplatesForSizeOptions,
  getTemplates,
  getAvailableSizeOptionsForNewTemplate,
  createTemplate,
  getTemplate,
  updateTemplate,
  isProductInformationDetailsComplete,
  validateProductInformationDetails,
  updateProductDetailsWithPicturesAndBulletPoints,
  getQuantityGroupForProductId,
  verifyQuantities,
  setQuantitiesForQuantityGroup,
  updateQuantitiesForQuantityGroup,
  createQuantityGroupAndSetQuantities,
  getOptionGroupForProductId,
  getPriceMatrixForProductId,
  getOptionTypesNotUsedByFinishingMatrixForProduct,
  getFinishingOptionTypesForProduct,
  getOptionTypesNotUsedByPricingMatrixForProduct,
  getFinishingMatricesForProductId,
  getFinishingMatrixOptionTypesAndOptionsForProduct,
  getFinishingMatricesDetailsForProductId,
  createFinishingMatrices,
  addAllOptionTypesToOptionTypesAndOptionToFinishingJson,
  deleteFinishingMatricesForProduct,
  isMatrixDetailsComplete,
  isAllFinishingMatricesComplete,
  isProductValid,
  deactivateProduct,
  activateProduct,
  setProductStatusComplete,
  getOptionById,
  createDefaultProduct,
  getFinishingMatrixRowsForQuantityGroup,
  getPriceMatrixRowsForQuantityGroup,
  getAllProductTypesNotInList,
  getQuantityGroupById,
  getQuantityGroupItemsByQuantityGroup,
  getAllOptions,
  createOptionGroupItems,
  createPriceMatrixRowQuantityPricesForRow,
  createPriceMatrixForProduct,
  createQuantityGroup,
  createPriceMatrixRow,
  getPriceMatrixRowQuantityPriceForRow,
  getPrintingAttributeType,
  createOptionTypeGroup,
  updatePriceMatrixRowQuantityPricesQuantityChange,
  getPriceMatrixRowQuantityPricesForMatrix,
  deletePriceMatrix,
  getPriceMatrixById,
  getOptionGroupItemsForPriceMatrix,
  getPriceMatrixRowsForMatrix,
  getOptionGroupsForMatrix,
  getOptionTypeGroupItemsForProduct,
  getOptionTypeGroupsForProduct,
  createQuantityGroupItem,
  getFinishingMatrixRowQuantityPrices,
  updateFinishingMatrixRowQuantityPricesQuantityChange,
  getFinishingMatrixById,
  getFinishingMatrixRowsForFinishingMatrix,
  getAllAttributeTypes,
};
