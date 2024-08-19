const { isEmpty } = require('lodash');
const saleValidator = require('../../../validators/sale');
const { createTestProduct } = require('../../helper/productTestHelper');
const { createSale, getSaleById } = require('../../../utility/sales/salesOperations');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('validate sales', () => {
  it('should populate errors when fromDt and toDt is not a valid date', () => {
    const fromDt = '';
    const toDt = '';
    const errors = saleValidator.validateDate(fromDt, toDt);

    expect(errors.fromDt).toBe('Please enter valid date');
    expect(errors.toDt).toBe('Please enter valid date');
  });

  it('should return error if fromDt is after toDt', () => {
    const fromDt = '2023-01-01';
    const toDt = '2022-01-01';
    const errors = saleValidator.validateDate(fromDt, toDt);
    expect(errors.fromDt).toBe('FromDt must be before ToDt');
  });

  it('should return error if sale names, description or percentage incorrect', () => {
    const name = '';
    const fromDt = '2023-01-01';
    const toDt = '2024-01-01';
    const description = '';
    const percentage = '0';
    const ids = '[]';
    const body = {
      name,
      fromDt,
      toDt,
      description,
      percentage,
      ids,
    };

    const errors = saleValidator.validateSale(body);

    expect(errors.fromDt).toBe(undefined);
    expect(errors.toDt).toBe(undefined);
    expect(errors.name).toBe('Please enter name between 3 and 50 characters in length.');
    expect(errors.description).toBe('Please set a description');
    expect(errors.percentage).toBe('Please set a valid percentage');
    expect(errors.ids).toBe('Please select a product.');
  });

  it('should return no errors if details are valid', () => {
    const name = 'name';
    const fromDt = '2023-01-01';
    const toDt = '2024-01-01';
    const description = 'description';
    const percentage = '10';
    const ids = '["1"]';
    const body = {
      name,
      fromDt,
      toDt,
      description,
      percentage,
      ids,
    };

    const errors = saleValidator.validateSale(body);
    const isErrors = !isEmpty(errors);
    expect(isErrors).toBe(false);
  });

  it('should return true when the sale details have not changed', async () => {
    const product = await createTestProduct(true, true);

    const name = 'name';
    const fromDt = '2022-01-01';
    const toDt = '2023-01-01';
    const description = 'description';
    const percentage = 10;
    const ids = `["${product.id}"]`;
    const body = {
      name,
      fromDt,
      toDt,
      description,
      percentage,
      ids,
    };
    const createdSale = await createSale(name, fromDt, toDt, description, percentage, ids);
    const sale = await getSaleById(createdSale.id);
    const hasNotChanged = await saleValidator.hasSaleNotChanged(body, sale);
    expect(hasNotChanged).toBe(true);
  });

  it('should return false when the sale details have changed', async () => {
    const product = await createTestProduct(true, true);

    const name = 'name';
    const fromDt = '2022-01-01';
    const toDt = '2023-01-01';
    const description = 'description';
    const percentage = 10;
    const ids = `["${product.id}"]`;
    const body = {
      name,
      fromDt,
      toDt,
      description: 'hello',
      percentage,
      ids: '[11]',
    };
    const createdSale = await createSale(name, fromDt, toDt, description, percentage, ids);
    const sale = await getSaleById(createdSale.id);
    const hasChanged = await saleValidator.hasSaleNotChanged(body, sale);
    expect(hasChanged).toBe(false);
  });
});

afterEach(async () => {
  await truncateTables(['sales', 'products', 'saleProducts']);
});
