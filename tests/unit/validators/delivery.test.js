const { isEmpty } = require('lodash');
const deliveryValidator = require('../../../validators/delivery');

describe('validate delivery', () => {
  it('should return empty errors when all inputs are valid', () => {
    const body = {
      standardPrice: '1.00',
      standardWorkingDays: '4',
      expressPrice: '1.00',
      expressWorkingDays: '4',
      collectionWorkingDays: '10',
    };
    const errors = deliveryValidator.validateDeliveryOptions(body);

    expect(isEmpty(errors)).toBe(true);
  });

  it('should return populated errors when inputs are not valid', () => {
    const body = {
      standardPrice: 'f',
      standardWorkingDays: 'g',
      expressPrice: 'o',
      expressWorkingDays: 'fjkdf',
      collectionWorkingDays: 'd',
    };
    const errors = deliveryValidator.validateDeliveryOptions(body);

    expect(isEmpty(errors)).toBe(false);
    expect(errors.standardPrice).toBe('Please enter a valid price');
    expect(errors.expressPrice).toBe('Please enter a valid price');
    expect(errors.expressWorkingDays).toBe('Please set to a value between 1 and 30');
    expect(errors.collectionWorkingDays).toBe('Please set to a value between 1 and 30');
    expect(errors.standardWorkingDays).toBe('Please set to a value between 1 and 30');
  });

  it('should return error when spend over no valid', () => {
    const spendOver = '';
    const errors = deliveryValidator.validateSpendOver(spendOver);
    expect(isEmpty(errors)).toBe(false);
    expect(errors.spendOver).toBe('Please enter a valid amount above 1');
  });

  it('should return no errors when spend over is valid', () => {
    const spendOver = '5.00';
    const errors = deliveryValidator.validateSpendOver(spendOver);
    expect(isEmpty(errors)).toBe(true);
  });
});
