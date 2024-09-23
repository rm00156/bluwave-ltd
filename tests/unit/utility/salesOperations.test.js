const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestSale } = require('../../helper/saleTestHelper');
const { createTestProduct } = require('../../helper/productTestHelper');
const { getAllQuantities } = require('../../../utility/products/productOperations');
const { createTestBasketItem, createTestPurchaseBasketForBasketItem } = require('../../helper/basketTestHelper');
const { convertDateToString } = require('../../../utility/general/utilityHelper');
const { createTestPromoCode } = require('../../helper/promoCodeTestHelper');

const saleOperations = require('../../../utility/sales/salesOperations');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

describe('sale operation', () => {
  it('should return no sale if no id', async () => {
    const sale = await saleOperations.getSaleById(0);
    expect(sale).toBeNull();
  });

  it('should return sale with id', async () => {
    const { sale } = await createTestSale();
    const getSale = await saleOperations.getSaleById(sale.id);
    expect(getSale).not.toBeNull();
    expect(getSale.id).toBe(sale.id);
  });

  it('should return products linked to sale', async () => {
    const { sale, product } = await createTestSale();
    const getProducts = await saleOperations.getProductsForSaleId(sale.id);

    expect(getProducts.length).toBe(1);
    const getProduct = getProducts[0];
    expect(getProduct.id).toBe(product.id);
  });

  it('should return products which have no active sale', async () => {
    const product = await createTestProduct(true, true);

    const products = await saleOperations.getProductsWithNoActiveSale('2022-01-01', '2022-01-01');
    expect(products.length).toBe(1);

    expect(products[0].id).toBe(product.id);
  });

  it('should return null if ids list is empty', async () => {
    const saleProducts = await saleOperations.createSaleProducts(0, []);
    expect(saleProducts).toBeNull();
  });

  it('should return sale with updatd details', async () => {
    const { sale, product } = await createTestSale();
    const name = 'newName';
    const fromDt = '2022-01-01';
    const toDt = '2022-01-01';
    const description = 'newDescription';
    const percentage = 44;
    const ids = `["${product.id}"]`;

    const updatedSale = await saleOperations.updateSale(sale.id, name, fromDt, toDt, description, percentage, ids);
    expect(updatedSale.id).not.toBe(sale.id);
    expect(updatedSale.name).toBe(name);
    expect(updatedSale.fromDt).toEqual(new Date(fromDt));
    expect(updatedSale.toDt).toEqual(saleOperations.midnightDate(toDt));
    expect(updatedSale.description).toBe(description);
    expect(updatedSale.percentage).toBe(percentage);

    const products = await saleOperations.getProductsForSaleId(updatedSale.id);
    expect(products.length).toBe(1);

    expect(products[0].id).toBe(product.id);
  });

  it('should delete sale and all associated sale products', async () => {
    const { sale } = await createTestSale();
    const saleProducts = await saleOperations.getSaleProductsForSaleId(sale.id);

    expect(saleProducts.length).toBe(1);

    await saleOperations.deleteSaleById(sale.id);

    const deletedSale = await saleOperations.getSaleById(sale.id);
    expect(deletedSale).toBeNull();
    const deletedSaleProducts = await saleOperations.getSaleProductsForSaleId(sale.id);

    expect(deletedSaleProducts.length).toBe(0);
  });

  it('should deactivate sale by id', async () => {
    const { sale } = await createTestSale();
    expect(sale.deleteFl).toBe(false);

    await saleOperations.deactivateSale(sale.id);

    const updatedSale = await saleOperations.getSaleById(sale.id);
    expect(updatedSale.deleteFl).toBe(1);
    expect(updatedSale.versionNo).toBe(2);
  });

  it('should increment the sale usedCount for order by id', async () => {
    const quantities = await getAllQuantities();
    const quantity = quantities[0];
    const price = '5.00';
    const { sale } = await createTestSale();

    const basketItem = await createTestBasketItem([{ id: quantity.id, price }], sale.id);
    const accountId = basketItem.accountFk;
    const deliveryType = 'Collection';
    const purchaseBasket = await createTestPurchaseBasketForBasketItem(accountId, deliveryType, Date.now(), basketItem.id);

    await saleOperations.updateSalesUsedCountForOrder(purchaseBasket.id);
    expect(sale.usedCount).toBe(0);

    const updatedSale = await saleOperations.getSaleById(sale.id);
    expect(updatedSale.usedCount).toBe(1);
  });

  it('should return false if ids is empty array', async () => {
    const { sale } = await createTestSale();
    const newSale = await createTestSale();
    const success = await saleOperations.setSaleForBasketItems(sale.id, newSale.sale.id, '[]', 10);

    expect(success).toBe(false);
  });

  it('should return true if ids is populated', async () => {
    const { sale, product } = await createTestSale();
    const newSale = await createTestSale();
    const success = await saleOperations.setSaleForBasketItems(sale.id, newSale.sale.id, `["${product.id}"]`, 10);

    expect(success).toBe(true);
  });

  it('should return products which overlap dates', async () => {
    const fromDt = '2022-01-01';
    const toDt = '2023-01-01';
    const { sale } = await createTestSale(fromDt, toDt);

    const overlapFromDt = '2022-05-05';
    const overlapToDt = '2022-06-05';
    const products = await saleOperations.getProductsForSaleIdWhichOverlapDates(sale.id, overlapFromDt, overlapToDt);

    expect(products.length).toBe(1);
  });

  it('should return non active sale for product', async () => {
    const { sale, product } = await createTestSale();

    const saleFromProduct = await saleOperations.getSaleForProductId(product.id);
    expect(saleFromProduct.id).toBe(sale.id);
  });

  it('should return null when no sale for product', async () => {
    const product = await createTestProduct(true, true);

    const saleFromProduct = await saleOperations.getSaleForProductId(product.id);
    expect(saleFromProduct).toBeNull();
  });

  it('should return active sale when for product', async () => {
    const date = new Date();

    const dateString = convertDateToString(date);
    const { sale, product } = await createTestSale(dateString, dateString);

    const saleFromProduct = await saleOperations.getSaleForProductId(product.id, true);
    expect(saleFromProduct.id).toBe(sale.id);
  });

  it('should return price if no sale found', () => {
    const price = 5;
    const subTotal = saleOperations.getSubTotal(price);

    expect(subTotal).toBe(price);
  });

  it('should return sale percentage of price if sale found', async () => {
    const price = 5;
    const { sale } = await createTestSale();

    const subTotal = saleOperations.getSubTotal(price, sale);

    expect(subTotal).toBe('4.50');
  });

  it('should return promo code percentage of price if promo code only found', async () => {
    const price = 5;
    const { promoCode } = await createTestPromoCode();

    const subTotal = saleOperations.getSubTotal(price, null, promoCode);

    expect(subTotal).toBe('4.50');
  });
});

afterEach(async () => {
  await truncateTables(['sales', 'saleProducts', 'products', 'basketItems', 'purchaseBaskets']);
});
