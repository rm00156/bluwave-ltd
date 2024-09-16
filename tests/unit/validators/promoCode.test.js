const { isEmpty } = require('lodash');
const promoCodeValidator = require('../../../validators/promoCode');
const { createTestProduct } = require('../../helper/productTestHelper');
const { createPromoCode, getPromoCodeById } = require('../../../utility/promoCode/promoCodeOperations');

const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('validate promo code', () => {
  it('should return error when promoCodeTypeId not found', async () => {
    const promoCodeTypeId = 0;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '1',
      description: 'description',
      percentage: '10',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.promoCodeType).toBe('Please select a valid promo code type');
  });

  it('should return error when maxUses less than 1', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '0',
      description: 'description',
      percentage: '10',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.maxUses).toBe('Max uses must either be not set or be a number greater than 0.');
  });

  it('should return error when description not set', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '',
      description: '',
      percentage: '10',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.description).toBe('Please set a description');
  });

  it('should return error when promo code not greater than 3', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: '12',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '',
      description: 'decription',
      percentage: '10',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.code).toBe('Please set a promo code between 3 and 50 characters in length.');
  });

  it('should return error when percentage between 1 and 100', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '',
      description: 'decription',
      percentage: '0',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.percentage).toBe('Please set a valid percentage');
  });

  it('should return error when no product selected', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '',
      description: 'decription',
      percentage: '10',
      ids: '[]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    expect(errors.ids).toBe('Please select a product.');
  });

  it('should return no errors when all values populated correctly', async () => {
    const promoCodeTypeId = 1;
    const body = {
      promoCodeTypeId,
      code: 'code',
      fromDt: '2023-01-01',
      toDt: '2024-01-01',
      maxUses: '',
      description: 'decription',
      percentage: '10',
      ids: '["1"]',
    };
    const errors = await promoCodeValidator.validatePromoCode(body);

    const isErrors = !isEmpty(errors);
    expect(isErrors).toBe(false);
  });

  it('should return true if field value is empty and promoCode value is null', async () => {
    const promoCode = {
      name: null,
    };

    const isNumberFieldSame = promoCodeValidator.isNumberFieldSame('name', '', promoCode);

    expect(isNumberFieldSame).toBe(true);
  });

  it('should return true if field value not empty and match promoCode value', async () => {
    const promoCode = {
      name: 1,
    };

    const isNumberFieldSame = promoCodeValidator.isNumberFieldSame('name', '1', promoCode);

    expect(isNumberFieldSame).toBe(true);
  });

  it("should return false if field value not empty and don't match promoCode value", async () => {
    const promoCode = {
      name: 2,
    };

    const isNumberFieldSame = promoCodeValidator.isNumberFieldSame('name', '1', promoCode);

    expect(isNumberFieldSame).toBe(false);
  });

  it('should return sale has not changed', async () => {
    const product = await createTestProduct(true, true);
    const code = 'code';
    const fromDt = '2023-01-01';
    const toDt = '2024-01-01';
    const description = 'description';
    const percentage = '10';
    const maxUses = '2';
    const promoCodeTypeId = '1';
    const ids = `["${product.id}"]`;

    const promoCode = await createPromoCode(
      code,
      fromDt,
      toDt,
      description,
      percentage,
      promoCodeTypeId,
      maxUses,
      ids,
    );

    const getPromoCode = await getPromoCodeById(promoCode.id);

    const body = {
      code,
      fromDt,
      toDt,
      description,
      percentage,
      maxUses,
      promoCodeTypeId,
      ids,
    };
    const hasPromoCodeNotChanged = await promoCodeValidator.hasPromoCodeNotChanged(body, getPromoCode);
    expect(hasPromoCodeNotChanged).toBe(true);
  });
});

afterEach(async () => {
  await truncateTables(['promoCodes', 'products', 'promoCodeProducts']);
});
