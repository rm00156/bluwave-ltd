const { createSale } = require('../../utility/sales/salesOperations');
const { createTestProduct } = require('./productTestHelper');

async function createTestSale(fromDt, toDt) {
  const product = await createTestProduct(true, true);
  const sale = await createSale('name', fromDt ?? '2022-01-01', toDt ?? '2023-01-01', 'description', 10, `["${product.id}"]`);
  return { sale, product };
}

module.exports = {
  createTestSale,
};
