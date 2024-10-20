const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const {
  createTestFileGroupItem,
  createTestBasketItem,
  createTestPurchaseBasketForBasketItem,
} = require('../../helper/basketTestHelper');
const { createTestCustomerAccount } = require('../../helper/accountTestHelper');
const { createTestSale } = require('../../helper/saleTestHelper');
const { createTestPromoCode } = require('../../helper/promoCodeTestHelper');

const { deleteS3Folder } = require('../../../utility/general/utilityHelper');
const { createTestProduct, createTestProductWithPriceMatrix } = require('../../helper/productTestHelper');
const {
  createOptionGroup,
  getOptionGroupItemsForPriceMatrix,
  getAllQuantities,
  getAllOptions,
  getOptionGroupItemsByOptionGroupId,
  getOptionGroupById,
} = require('../../../utility/products/productOperations');
const { completePurchaseBasket } = require('../../../utility/order/orderOperations');
const basketOperations = require('../../../utility/basket/basketOperations');

let quantities;
beforeAll(async () => {
  await setUpTestDb();
  quantities = await getAllQuantities();
}, 60000);

test('create file group', async () => {
  const fileGroup = await basketOperations.createFileGroup();
  expect(fileGroup).not.toBeNull();
});

test('create file group item', async () => {
  const fileGroup = await basketOperations.createFileGroup();
  const path = 'path';
  const fileName = 'fileName';
  const fileGroupItem = await basketOperations.createFileGroupItem(fileGroup.id, path, fileName);

  expect(fileGroupItem).not.toBeNull();
  expect(fileGroupItem.fileGroupFk).toBe(fileGroup.id);
  expect(fileGroupItem.path).toBe(path);
  expect(fileGroupItem.fileName).toBe(fileName);
});

test('should return fileGroupItems by file group id', async () => {
  const fileGroupItem = await createTestFileGroupItem();
  const getFileGroupItems = await basketOperations.getFileGroupItemsByFileGroupId(fileGroupItem.fileGroupFk);
  expect(getFileGroupItems.length).toBe(1);

  const getFileGroupItem = getFileGroupItems[0];
  expect(getFileGroupItem.id).toBe(fileGroupItem.id);
  expect(getFileGroupItem.fileGroupFk).toBe(fileGroupItem.fileGroupFk);
  expect(getFileGroupItem.path).toBe(fileGroupItem.path);
  expect(getFileGroupItem.fileName).toBe(fileGroupItem.fileName);
});

test('create basket item', async () => {
  const account = await createTestCustomerAccount();
  const product = await createTestProduct(true, true);
  const options = await getAllOptions();
  const quantity1 = quantities[0];
  const quantity2 = quantities[1];
  const quantity3 = quantities[2];
  const quantityIds = [quantity1.id, quantity2.id, quantity3.id];
  const option1 = options[0];
  const option2 = options[1];
  const optionIds = [option1.id, option2.id];
  const rows = [
    {
      optionIdGroup: [option1.id, option2.id],
      quantityGroup: [
        { id: quantity1.id, price: '4.00' },
        { id: quantity2.id, price: '5.00' },
        { id: quantity3.id, price: '11.00' },
      ],
    },
  ];

  const { priceMatrix } = await createTestProductWithPriceMatrix(quantityIds, optionIds, rows);

  const optionGroups = await getOptionGroupItemsForPriceMatrix(priceMatrix.id);
  const optionGroup = optionGroups[0];
  const price = '5.00';
  const basketItem = await basketOperations.createBasketItem(
    account.id,
    product.id,
    optionGroup.id,
    null,
    quantity2.id,
    price,
    price,
    null,
  );
  expect(basketItem).not.toBeNull();
  expect(basketItem.accountFk).toBe(account.id);
  expect(basketItem.productFk).toBe(product.id);
  expect(basketItem.optionGroupFk).toBe(optionGroup.id);
  expect(basketItem.finishingOptionGroupFk).toBeNull();
  expect(basketItem.quantityFk).toBe(quantity2.id);
  expect(basketItem.price).toBe(price);
});

describe('get file group by id', () => {
  it('should return file group when id exists', async () => {
    const fileGroup = await basketOperations.createFileGroup();

    const getFileGroup = await basketOperations.getFileGroupById(fileGroup.id);
    expect(getFileGroup).not.toBeNull();
  });

  it('should return null when id does not exists', async () => {
    const getFileGroup = await basketOperations.getFileGroupById(0);
    expect(getFileGroup).toBeNull();
  });
});

describe('get basket item', () => {
  it('should return basket item when id exists', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

    const getBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(getBasketItem).not.toBeNull();
  });

  it('should return null when id does not exist', async () => {
    const getBasketItem = await basketOperations.getBasketItem(0);
    expect(getBasketItem).toBeNull();
  });
});

test('should edit basket item', async () => {
  const quantity = quantities[0];
  const price = '10.00';
  const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

  const newQuantity = quantities[1];
  const newPrice = '55.00';

  await basketOperations.editBasketItem(basketItem.id, basketItem.optionGroupFk, null, newQuantity.id, newPrice);

  const editedBasketItem = await basketOperations.getBasketItem(basketItem.id);
  expect(editedBasketItem.price).toBe(newPrice);
  expect(editedBasketItem.quantityFk).toBe(newQuantity.id);
  expect(editedBasketItem.optionGroupFk).toBe(basketItem.optionGroupFk);
  expect(editedBasketItem.finishingOptionGroupFk).toBeNull();
});

describe('remove basket Item', () => {
  it('should destroy basket item and associated optionGroup and optionGroupItems', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const optionGroupItems = await getOptionGroupItemsByOptionGroupId(optionGroupId);
    expect(optionGroupItems.length).toBeGreaterThan(0);

    await basketOperations.removeBasketItem(basketItem.id);

    const removedBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(removedBasketItem).toBeNull();

    const removedOptionGroup = await getOptionGroupById(optionGroupId);
    expect(removedOptionGroup).toBeNull();

    const removedOptionGroupItems = await getOptionGroupItemsByOptionGroupId(optionGroupId);
    expect(removedOptionGroupItems.length).toBe(0);
  });

  it('should destroy purchase basket if one is linked to basket item', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const account = await createTestCustomerAccount();
    const deliveryType = 'Collection';
    const purchaseBasket = await createTestPurchaseBasketForBasketItem(account.id, deliveryType, Date.now(), basketItem.id);

    await basketOperations.removeBasketItem(basketItem.id);
    const removedBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(removedBasketItem).toBeNull();

    const removedOptionGroup = await getOptionGroupById(optionGroupId);
    expect(removedOptionGroup).toBeNull();

    const removedOptionGroupItems = await getOptionGroupItemsByOptionGroupId(optionGroupId);
    expect(removedOptionGroupItems.length).toBe(0);
    const removedPurchaseBasket = await basketOperations.getPurchaseBasketById(purchaseBasket.id);
    expect(removedPurchaseBasket).toBeNull();
  });

  it('should destroy file group and items if one is linked to basket item', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const fileGroup = await basketOperations.createFileGroup();
    await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');
    await basketOperations.setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    await basketOperations.removeBasketItem(basketItem.id);
    const removedBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(removedBasketItem).toBeNull();

    const removedOptionGroup = await getOptionGroupById(optionGroupId);
    expect(removedOptionGroup).toBeNull();

    const removedFileGroupItems = await basketOperations.getFileGroupItemsForBasketItem(basketItem.id);
    expect(removedFileGroupItems.length).toBe(0);
    const removedFileGroup = await basketOperations.getFileGroupById(fileGroup.id);
    expect(removedFileGroup).toBeNull();
  });
});

describe('get file group items for basketItem', () => {
  it('should return file group items for basketItem if they exist', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const fileGroup = await basketOperations.createFileGroup();
    const fileGroupItem = await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');
    await basketOperations.setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    const updateBasketItem = await basketOperations.getBasketItem(basketItem.id);
    const fileGroupItems = await basketOperations.getFileGroupItemsForBasketItem(updateBasketItem);

    expect(fileGroupItems.length).toBe(1);
    expect(fileGroupItems.filter((f) => f.id === fileGroupItem.id).length).toBe(1);
  });

  it('should return empty list when file group items do not exist for basket item', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const fileGroupItems = await basketOperations.getFileGroupItemsForBasketItem(basketItem);

    expect(fileGroupItems.length).toBe(0);
  });
});

describe('remove file group item', () => {
  it('should remove file group item where group has more than 1 item', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const fileGroup = await basketOperations.createFileGroup();
    const fileGroupItem = await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');
    await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');

    await basketOperations.setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    await basketOperations.removeFileGroupItem(fileGroupItem.id, basketItem.id);

    const removedFileGroupItem = await basketOperations.getFileGroupItemById(fileGroupItem.id);
    expect(removedFileGroupItem).toBeNull();

    const updatedFileGroup = await basketOperations.getFileGroupById(fileGroup.id);
    expect(updatedFileGroup).not.toBeNull();

    const updatedBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(updatedBasketItem.fileGroupFk).not.toBeNull();
  });

  it('should remove file group item and file group and update basket item where group has 1 item', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const optionGroupId = basketItem.optionGroupFk;
    expect(optionGroupId).not.toBeNull();

    const fileGroup = await basketOperations.createFileGroup();
    const fileGroupItem = await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');

    await basketOperations.setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    await basketOperations.removeFileGroupItem(fileGroupItem.id, basketItem.id);

    const removedFileGroupItem = await basketOperations.getFileGroupItemById(fileGroupItem.id);
    expect(removedFileGroupItem).toBeNull();

    const updatedFileGroup = await basketOperations.getFileGroupById(fileGroup.id);
    expect(updatedFileGroup).toBeNull();

    const updatedBasketItem = await basketOperations.getBasketItem(basketItem.id);
    expect(updatedBasketItem.fileGroupFk).toBeNull();
  });
});

test('should update basket items account id', async () => {
  const quantity = quantities[0];
  const basketItem = await createTestBasketItem([{ id: quantity.id, price: '5.00' }]);

  const newAccount = await createTestCustomerAccount();

  await basketOperations.setBasketItemsAccountId(newAccount.id, [basketItem.id]);

  const updatedBasketItem = await basketOperations.getBasketItem(basketItem.id);
  expect(updatedBasketItem.accountFk).toBe(newAccount.id);
});

describe('create revised basket item', () => {
  it('should return basket item price and update revised basket items list', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    const createdBasketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const basketItem = await basketOperations.getBasketItem(createdBasketItem.id);

    const revisedBasketItems = [];
    const { total } = await basketOperations.createRevisedBasketItem(basketItem, revisedBasketItems);
    expect(total).toBe(parseFloat(price));
    expect(revisedBasketItems.length).toBe(1);
    const revisedBasketItem = revisedBasketItems[0];
    expect(revisedBasketItem.finishingOptions.length).toBe(0);
    expect(revisedBasketItem.options.length).toBe(1);
    expect(revisedBasketItem.quantities.length).toBe(1);
    expect(revisedBasketItem.fileGroupItems).toBe(undefined);
  });

  it('should return basket item price and update revised basket items list when basket item has promo code but no sale', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    const { promoCode } = await createTestPromoCode();
    const createdBasketItem = await createTestBasketItem([{ id: quantity.id, price }], null, promoCode.id);
    const basketItem = await basketOperations.getBasketItem(createdBasketItem.id);

    const revisedBasketItems = [];
    const { total, subTotal } = await basketOperations.createRevisedBasketItem(basketItem, revisedBasketItems);
    expect(total).toBe(parseFloat(price));
    expect(subTotal).toBe(4.5);
    expect(revisedBasketItems.length).toBe(1);
    const revisedBasketItem = revisedBasketItems[0];
    expect(revisedBasketItem.finishingOptions.length).toBe(0);
    expect(revisedBasketItem.options.length).toBe(1);
    expect(revisedBasketItem.quantities.length).toBe(1);
    expect(revisedBasketItem.fileGroupItems).toBe(undefined);
  });

  it('should return basket item price and update revised basket items list including file group items', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    const { sale } = await createTestSale();
    const { promoCode } = await createTestPromoCode();
    const createdBasketItem = await createTestBasketItem([{ id: quantity.id, price }], sale.id, promoCode.id);
    const fileGroup = await basketOperations.createFileGroup();
    await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');
    await basketOperations.setFileGroupForBasketItem(createdBasketItem.id, fileGroup.id);
    const basketItem = await basketOperations.getBasketItem(createdBasketItem.id);

    const revisedBasketItems = [];
    const { total, subTotal } = await basketOperations.createRevisedBasketItem(basketItem, revisedBasketItems);
    expect(total).toBe(parseFloat(price));
    expect(subTotal).toBe(4.05);
    expect(revisedBasketItems.length).toBe(1);
    const revisedBasketItem = revisedBasketItems[0];
    expect(revisedBasketItem.finishingOptions.length).toBe(0);
    expect(revisedBasketItem.options.length).toBe(1);
    expect(revisedBasketItem.quantities.length).toBe(1);
    expect(revisedBasketItem.fileGroupItems.length).toBe(1);
  });
});

test('should return sub total for basket item ids', async () => {
  const quantity = quantities[0];
  const price1 = '5.00';
  const price2 = '11.00';
  const basketItem1 = await createTestBasketItem([{ id: quantity.id, price: price1 }]);
  const basketItem2 = await createTestBasketItem([{ id: quantity.id, price: price2 }]);

  const { subTotal } = basketOperations.getTotalsFromBasketItems([basketItem1, basketItem2]);
  expect(subTotal).toBe('16.00');
});

describe('get active basket items for an account', () => {
  it('should return no items when item part of a purchase', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const accountId = basketItem.accountFk;
    const deliveryType = 'Collection';
    const purchaseBasket = await createTestPurchaseBasketForBasketItem(accountId, deliveryType, Date.now(), basketItem.id);
    await completePurchaseBasket(purchaseBasket.id, Date.now());

    const activeBasketItemsForAccount = await basketOperations.getActiveBasketItemsForAccount(accountId);
    expect(activeBasketItemsForAccount.basketItems.length).toBe(0);
    expect(activeBasketItemsForAccount.totalCost).toBe('0.00');
  });

  it('should return items when item is not part of a purchase', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    const { sale } = await createTestSale();
    const { promoCode } = await createTestPromoCode();
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }], sale.id, promoCode.id);
    const accountId = basketItem.accountFk;

    const activeBasketItemsForAccount = await basketOperations.getActiveBasketItemsForAccount(accountId);
    expect(activeBasketItemsForAccount.basketItems.length).toBe(1);
    expect(activeBasketItemsForAccount.totalCost).toBe(price);
  });
});

describe('get all basket items for checkout', () => {
  it('should return all items where file group exist', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

    const fileGroup = await basketOperations.createFileGroup();
    await basketOperations.createFileGroupItem(fileGroup.id, 'Path', 'FileName');
    await basketOperations.setFileGroupForBasketItem(basketItem.id, fileGroup.id);

    const { basketItems } = await basketOperations.getAllBasketItemsForCheckout(basketItem.accountFk);
    expect(basketItems.length).toBe(1);
    const checkoutBasketItem = basketItems[0];
    expect(checkoutBasketItem.id).toBe(basketItem.id);
  });

  it('should return no items where file group does not exist', async () => {
    const quantity = quantities[0];
    const price = '10.00';
    const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
    const { basketItems } = await basketOperations.getAllBasketItemsForCheckout(basketItem.accountFk);
    expect(basketItems.length).toBe(0);
  });
});

test('get basket item details for successful order by purchase basket id', async () => {
  const quantity = quantities[0];
  const price = '5.00';
  const createdBasketItem = await createTestBasketItem([{ id: quantity.id, price }]);
  const basketItem = await basketOperations.getBasketItem(createdBasketItem.id);
  const accountId = basketItem.accountFk;
  const deliveryType = 'Collection';
  const purchaseBasket = await createTestPurchaseBasketForBasketItem(accountId, deliveryType, Date.now(), basketItem.id);
  await completePurchaseBasket(purchaseBasket.id, Date.now());

  const basketItemDetails = await basketOperations.getBasketItemDetailsForSuccessfulOrderByPurchaseBasketId(purchaseBasket.id);
  expect(basketItemDetails.length).toBe(1);
  const basketItemDetail = basketItemDetails[0];
  expect(basketItemDetail.finishingOptions.length).toBe(0);
  expect(basketItemDetail.options.length).toBe(1);
  expect(basketItemDetail.quantities.length).toBe(1);
  expect(basketItemDetail.fileGroupItems).toBe(undefined);
});

test('update quantity price for basket item', async () => {
  const quantity = quantities[0];
  const newQuantity = quantities[1];
  const price = '5.00';
  const createdBasketItem = await createTestBasketItem([
    { id: quantity.id, price },
    { id: newQuantity.id, price },
  ]);
  const basketItem = await basketOperations.getBasketItem(createdBasketItem.id);

  await basketOperations.updateQuantityPriceForBasketItem(basketItem.id, newQuantity.id);
  const updatedBasketItem = await basketOperations.getBasketItem(createdBasketItem.id);
  expect(updatedBasketItem.quantityFk).toBe(newQuantity.id);
  expect(updatedBasketItem.price).toBe(price);
});

test('should get basket items for orderId with sales and promo codes', async () => {
  const quantity = quantities[0];
  const price = '10.00';
  const { sale } = await createTestSale();
  const { promoCode } = await createTestPromoCode();
  const basketItem = await createTestBasketItem([{ id: quantity.id, price }], sale.id, promoCode.id);

  const optionGroupId = basketItem.optionGroupFk;
  expect(optionGroupId).not.toBeNull();

  const deliveryType = 'Collection';
  const purchaseBasket = await createTestPurchaseBasketForBasketItem(
    basketItem.accountFk,
    deliveryType,
    Date.now(),
    basketItem.id,
  );
  await completePurchaseBasket(purchaseBasket.id, Date.now());

  const basketItems = await basketOperations.getBasketItemsForOrderId(purchaseBasket.id);
  expect(basketItems.basketItems.length).toBe(1);
});

test('should get basket items for orderId with no sales and promo codes', async () => {
  const quantity = quantities[0];
  const price = '10.00';
  const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);

  const optionGroupId = basketItem.optionGroupFk;
  expect(optionGroupId).not.toBeNull();

  const deliveryType = 'Collection';
  const purchaseBasket = await createTestPurchaseBasketForBasketItem(
    basketItem.accountFk,
    deliveryType,
    Date.now(),
    basketItem.id,
  );
  await completePurchaseBasket(purchaseBasket.id, Date.now());

  const basketItems = await basketOperations.getBasketItemsForOrderId(purchaseBasket.id);
  expect(basketItems.basketItems.length).toBe(1);
});

test('should update basketItems where sale or promoCodes have expired', async () => {
  const fromDt = '2022-01-01';
  const toDt = '2023-01-01';

  const { sale, product } = await createTestSale(fromDt, toDt);
  const { promoCode } = await createTestPromoCode(fromDt, toDt, 10, product.id);

  const price = '10.00';
  const subTotal = (parseFloat(price) * (1 - promoCode.percentage / 100) * (1 - sale.percentage / 100)).toFixed(2);
  const quantity = quantities[0];

  const account = await createTestCustomerAccount();

  const optionGroup = await createOptionGroup();
  const basketItem = await basketOperations.createBasketItem(
    account.id,
    product.id,
    optionGroup.id,
    null,
    quantity.id,
    price,
    subTotal,
    sale.id,
    promoCode.id,
  );

  await basketOperations.removeExpiredPromoCodesAndSalesFromBasketItems();

  const updatedBasketItem = await basketOperations.getBasketItem(basketItem.id);
  expect(updatedBasketItem.saleFk).toBe(null);
  expect(updatedBasketItem.promoCodeFk).toBe(null);
  expect(updatedBasketItem.price).toBe(price);
  expect(updatedBasketItem.subTotal).toBe(price);
});

afterEach(async () => {
  await deleteS3Folder('test/');
  await truncateTables([
    'accounts',
    'basketItems',
    'fileGroups',
    'fileGroupItems',
    'optionGroups',
    'optionGroupItems',
    'priceMatrices',
    'priceMatrixRows',
    'priceMatrixRowQuantityPrices',
    'products',
    'promoCodes',
    'promoCodeProducts',
    'purchaseBaskets',
    'quantityGroups',
    'quantityGroupItems',
    'sales',
    'saleProducts',
  ]);
});
