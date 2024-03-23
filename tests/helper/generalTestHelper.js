const models = require('../../models');

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

module.exports = {
  truncateTables,
};
