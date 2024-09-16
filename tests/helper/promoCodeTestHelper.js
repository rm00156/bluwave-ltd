const { createPromoCode, getPromoCodeTypeByName } = require('../../utility/promoCode/promoCodeOperations');

const { createTestProduct } = require('./productTestHelper');

async function createTestPromoCode(fromDt, toDt, percentage, productFk, promoCodeTypeName) {
  const product = await createTestProduct(true, true);
  const promoCodeType = await getPromoCodeTypeByName(promoCodeTypeName ?? 'Standard');
  const promoCode = await createPromoCode(
    'code',
    fromDt ?? '2022-01-01',
    toDt ?? '2023-01-01',
    'description',
    percentage ?? 10,
    promoCodeType.id,
    1,
    `["${productFk ?? product.id}"]`,
  );
  return { promoCode, product };
}

module.exports = {
  createTestPromoCode,
};
