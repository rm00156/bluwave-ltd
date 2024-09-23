const logger = require('pino')();

const path = require('path');
const models = require('../../models');
const { readSqlFile, pauseForTimeInSecond } = require('../../utility/general/utilityHelper');
const { getAllAccountTypes } = require('../../utility/account/accountOperations');
const {
  getAllAttributeTypes,
  getAllOptions,
  getAllOptionTypes,
  getAllProductTypes,
  getAllQuantities,
} = require('../../utility/products/productOperations');
const { getFaqTypes } = require('../../utility/faq/faqOperations');
const { getRefundTypes } = require('../../utility/refund/refundOperations');
const { getAllPromoCodeTypes } = require('../../utility/promoCode/promoCodeOperations');

async function truncateTable(tableName, transaction) {
  await models.sequelize.query(`truncate table ${tableName}`, { transaction });
}
async function truncateTables(tableNames) {
  const transaction = await models.sequelize.transaction();
  try {
    await models.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

    tableNames.map((tableName) => truncateTable(tableName, transaction));
    await models.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
  } catch (err) {
    await transaction.rollback();
  }

  await transaction.commit();
}

async function setUpTestDb() {
  await models.sequelize.sync();
  const dir = __dirname.replace('/tests/helper', '');
  const accountTypes = await readSqlFile(path.join(dir, '/sql/accountTypes.sql'));
  const attributeTypes = await readSqlFile(path.join(dir, '/sql/attributeTypes.sql'));
  // const deliveryTypes = await readSqlFile(path.join(dir, '/sql/deliveryTypes.sql'));
  const faqTypes = await readSqlFile(path.join(dir, '/sql/faqTypes.sql'));
  const optionTypes = await readSqlFile(path.join(dir, '/sql/optionTypes.sql'));
  const options = await readSqlFile(path.join(dir, '/sql/options.sql'));
  const productTypes = await readSqlFile(path.join(dir, '/sql/productTypes.sql'));
  const quantities = await readSqlFile(path.join(dir, '/sql/quantities.sql'));
  const refundTypes = await readSqlFile(path.join(dir, '/sql/refundTypes.sql'));
  const promoCodeTypes = await readSqlFile(path.join(dir, '/sql/promoCodeTypes.sql'));

  const existingAccountTypes = await getAllAccountTypes();
  if (existingAccountTypes.length === 0) {
    await models.sequelize.query(accountTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingAttributeTypes = await getAllAttributeTypes();
  if (existingAttributeTypes.length === 0) {
    await models.sequelize.query(attributeTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  // const existingDeliveryTypes = await getAllActiveDeliveryTypes();
  // if (existingDeliveryTypes.length === 0) {
  //   await models.sequelize.query(deliveryTypes, { type: models.sequelize.QueryTypes.INSERT });
  //   await pauseForTimeInSecond(1);
  // }

  const existingFaqTypes = await getFaqTypes();
  if (existingFaqTypes.length === 0) {
    await models.sequelize.query(faqTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingOptionTypes = await getAllOptionTypes();
  if (existingOptionTypes.length === 0) {
    await models.sequelize.query(optionTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingOptions = await getAllOptions();
  if (existingOptions.length === 0) {
    await models.sequelize.query(options, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingProductTypes = await getAllProductTypes();
  if (existingProductTypes.length === 0) {
    await models.sequelize.query(productTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingQuantities = await getAllQuantities();
  if (existingQuantities.length === 0) {
    await models.sequelize.query(quantities, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingRefundTypes = await getRefundTypes();
  if (existingRefundTypes.length === 0) {
    await models.sequelize.query(refundTypes, { type: models.sequelize.QueryTypes.INSERT });
    await pauseForTimeInSecond(1);
  }

  const existingPromoCodeTypes = await getAllPromoCodeTypes();
  if (existingPromoCodeTypes.length === 0) {
    try {
      await models.sequelize.query(promoCodeTypes, { type: models.sequelize.QueryTypes.INSERT });
    } catch (err) {
      logger.error(err);
    }
    await pauseForTimeInSecond(1);
  }
}

module.exports = {
  setUpTestDb,
  truncateTables,
};
