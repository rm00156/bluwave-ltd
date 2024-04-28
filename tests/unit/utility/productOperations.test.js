const productOperations = require('../../../utility/products/productOperations');
const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const productTestHelper = require('../../helper/productTestHelper');

let quantities;
let options;

beforeAll(async () => {
  await setUpTestDb();

  quantities = await productOperations.getAllQuantities();
  options = await productOperations.getAllOptions();
}, 60000);

test('create option group items for optionGroup id', async () => {
  const optionIds = options.map((o) => o.id);
  const optionGroup = await productOperations.createOptionGroup();

  await productOperations.createOptionGroupItems(optionGroup.id, optionIds);
  const optionGroupItems = await productOperations.getOptionGroupItemsByOptionGroupId(optionGroup.id);
  expect(optionGroupItems.length).toBe(optionIds.length);

  const optionGroupItemsOptionGroupIds = optionGroupItems.filter((og) => og.optionGroupFk === optionGroup.id);
  expect(optionGroupItemsOptionGroupIds.length).toBe(optionIds.length);
});

test('create price matrix row quantity prices for price matrix row id', async () => {
  const quantityDetails = quantities.map((q) => ({ id: q.id, price: 5 }));
  const priceMatrix = await productTestHelper.createPriceMatrix();
  const optionGroup = await productOperations.createOptionGroup();

  const priceMatrixRow = await productOperations.createPriceMatrixRow(priceMatrix.id, optionGroup.id, 1);
  await productOperations.createPriceMatrixRowQuantityPricesForRow(priceMatrixRow.id, quantityDetails);

  const priceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPriceForRow(priceMatrixRow.id);
  expect(priceMatrixRowQuantityPrices.length).toBe(quantityDetails.length);
});

test('when a removing quantity, updatePriceMatrixRowQuantityPricesQuantityChange updates priceMatrixRowQuantityPrices correctly', async () => {
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
        { id: quantity1.id, price: '' },
        { id: quantity2.id, price: '5.00' },
        { id: quantity3.id, price: '11.00' },
      ],
    },
  ];
  const { quantityGroup, priceMatrix } = await productTestHelper.createTestProductWithPriceMatrix(
    quantityIds,
    optionIds,
    rows,
  );
  const priceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPricesForMatrix(priceMatrix.id);
  expect(priceMatrixRowQuantityPrices.length).toBe(3);
  const removeQuantityIds = [quantity1.id];

  await productOperations.updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroup.id, removeQuantityIds, []);

  const updatedPriceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPricesForMatrix(
    priceMatrix.id,
  );
  expect(updatedPriceMatrixRowQuantityPrices.length).toBe(2);

  const updatedPriceMatrixRowQuantityPricesWithRemovedQuantity = updatedPriceMatrixRowQuantityPrices.filter(
    (u) => u.quantityFk === quantity1.id,
  );
  expect(updatedPriceMatrixRowQuantityPricesWithRemovedQuantity.length).toBe(0);
});

test('when adding quantity, updatePriceMatrixRowQuantityPricesQuantityChange updates priceMatrixRowQuantityPrices correctly', async () => {
  const quantity1 = quantities[0];
  const quantity2 = quantities[1];
  const quantity3 = quantities[2];
  const quantity4 = quantities[3];
  const quantityIds = [quantity1.id, quantity2.id, quantity3.id];
  const option1 = options[0];
  const option2 = options[1];
  const optionIds = [option1.id, option2.id];
  const rows = [
    {
      optionIdGroup: [option1.id, option2.id],
      quantityGroup: [
        { id: quantity1.id, price: '' },
        { id: quantity2.id, price: '5.00' },
        { id: quantity3.id, price: '11.00' },
      ],
    },
  ];
  const { quantityGroup, priceMatrix } = await productTestHelper.createTestProductWithPriceMatrix(
    quantityIds,
    optionIds,
    rows,
  );
  const priceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPricesForMatrix(priceMatrix.id);
  expect(priceMatrixRowQuantityPrices.length).toBe(3);
  const addQuantityIds = [quantity4.id];

  await productOperations.updatePriceMatrixRowQuantityPricesQuantityChange(quantityGroup.id, [], addQuantityIds);

  const updatedPriceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPricesForMatrix(
    priceMatrix.id,
  );
  expect(updatedPriceMatrixRowQuantityPrices.length).toBe(4);

  const updatedPriceMatrixRowQuantityPricesWithAddedQuantity = updatedPriceMatrixRowQuantityPrices.filter(
    (u) => u.quantityFk === quantity4.id,
  );
  expect(updatedPriceMatrixRowQuantityPricesWithAddedQuantity.length).toBe(1);

  const updatedPriceMatrixRowQuantityPriceWithAddedQuantity = updatedPriceMatrixRowQuantityPricesWithAddedQuantity[0];

  expect(updatedPriceMatrixRowQuantityPriceWithAddedQuantity.price).toBeNull();
});

test('delete price matrix for product', async () => {
  const quantity1 = quantities[0];
  const quantityIds = [quantity1.id];
  const option1 = options[0];
  const optionIds = [option1.id];
  const rows = [
    {
      optionIdGroup: [option1.id],
      quantityGroup: [{ id: quantity1.id, price: '' }],
    },
  ];

  const { product, priceMatrix } = await productTestHelper.createTestProductWithPriceMatrix(quantityIds, optionIds, rows);
  expect(priceMatrix.deleteFl).toBe(false);

  await productOperations.deletePriceMatrixForProduct(product.id);
  const deletedPriceMatrix = await productOperations.getPriceMatrixById(priceMatrix.id);
  expect(deletedPriceMatrix.deleteFl).toBe(true);

  const priceMatrixRowQuantityPrices = await productOperations.getPriceMatrixRowQuantityPricesForMatrix(priceMatrix.id);
  const deletedPriceMatrixRowQuantityPrices = priceMatrixRowQuantityPrices.filter((p) => p.deleteFl === 1);
  expect(priceMatrixRowQuantityPrices.length).toBe(deletedPriceMatrixRowQuantityPrices.length);

  const optionGroupItems = await productOperations.getOptionGroupItemsForPriceMatrix(priceMatrix.id);
  expect(optionGroupItems.length).toBeGreaterThan(0);
  expect(optionGroupItems.filter((o) => o.deleteFl === 0).length).toBe(0);

  const priceMatrixRows = await productOperations.getPriceMatrixRowsForMatrix(priceMatrix.id);
  expect(priceMatrixRows.length).toBeGreaterThan(0);
  expect(priceMatrixRows.filter((o) => o.deleteFl === 0).length).toBe(0);

  const optionGroups = await productOperations.getOptionGroupsForMatrix(priceMatrix.id);
  expect(optionGroups.length).toBeGreaterThan(0);
  expect(optionGroups.filter((o) => o.deleteFl === 0).length).toBe(0);

  const optionTypeGroupItems = await productOperations.getOptionTypeGroupItemsForProduct(product.id);
  expect(optionTypeGroupItems.length).toBeGreaterThan(0);
  expect(optionTypeGroupItems.filter((o) => o.deleteFl === 0).length).toBe(0);

  const optionTypeGroups = await productOperations.getOptionTypeGroupsForProduct(product.id);
  expect(optionTypeGroups.length).toBeGreaterThan(0);
  expect(optionTypeGroups.filter((o) => o.deleteFl === 0).length).toBe(0);
});

describe('get price matrix by id', () => {
  it('when id not linked to a priceMatrix should return null', async () => {
    const priceMatrix = await productOperations.getPriceMatrixById(0);
    expect(priceMatrix).toBeNull();
  });

  it('when id is linked to a priceMatrix should return priceMatrix', async () => {
    const priceMatrix = await productTestHelper.createPriceMatrix();

    const getPriceMatrix = await productOperations.getPriceMatrixById(priceMatrix.id);
    expect(getPriceMatrix.id).toBe(priceMatrix.id);
  });
});

describe('get product by id', () => {
  it('when id not linked to a product should return null', async () => {
    const product = await productOperations.getProductById(0);
    expect(product).toBeNull();
  });

  it('when id is linked to a product should return product', async () => {
    const product = await productTestHelper.createTestProduct(false, true);

    const getProduct = await productOperations.getProductById(product.id);
    expect(getProduct.id).toBe(product.id);
  });
});

describe('updateFinishingMatrixRowQuantityPricesQuantityChange', () => {
  it('when a removing quantity, updateFinishingMatrixRowQuantityPricesQuantityChange updates finishingMatrixRowQuantityPrices correctly', async () => {
    const quantity = quantities[0];
    const quantity2 = quantities[1];
    const productQuantityIds = [quantity.id, quantity2.id];
    const option = options[0];
    const productMatrices = [
      [
        {
          optionId: [option.id],
          quantityGroup: [
            { id: quantity.id, price: '12' },
            { id: quantity2.id, price: '2' },
          ],
        },
      ],
    ];

    const { quantityGroup, finishingMatrices } = await productTestHelper.createTestProductWithFinishingMatrices(
      productQuantityIds,
      productMatrices,
    );

    const finishingMatrix = finishingMatrices[0];
    const finishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(finishingMatrix.id);
    expect(finishingMatrixRowQuantityPrices.length).toBe(2);
    const removeQuantityIds = [quantity.id];

    await productOperations.updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroup.id, removeQuantityIds, []);

    const updatedFinishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(
      finishingMatrix.id,
    );
    expect(updatedFinishingMatrixRowQuantityPrices.length).toBe(1);

    const updatedFinishinMatrixRowQuantityPricesWithRemovedQuantity = updatedFinishingMatrixRowQuantityPrices.filter(
      (u) => u.quantityFk === quantity.id,
    );
    expect(updatedFinishinMatrixRowQuantityPricesWithRemovedQuantity.length).toBe(0);
  });

  it('when adding quantity, updateFinishingMatrixRowQuantityPricesQuantityChange updates finishingMatrixRowQuantityPrices correctly', async () => {
    const quantity = quantities[0];
    const quantity2 = quantities[1];
    const quantity3 = quantities[2];
    const productQuantityIds = [quantity.id, quantity2.id];
    const option = options[0];
    const productMatrices = [
      [
        {
          optionId: [option.id],
          quantityGroup: [
            { id: quantity.id, price: '12' },
            { id: quantity2.id, price: '2' },
          ],
        },
      ],
    ];

    const { quantityGroup, finishingMatrices } = await productTestHelper.createTestProductWithFinishingMatrices(
      productQuantityIds,
      productMatrices,
    );
    const finishingMatrix = finishingMatrices[0];
    const finishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(finishingMatrix.id);
    expect(finishingMatrixRowQuantityPrices.length).toBe(2);

    const addQuantityIds = [quantity3.id];

    await productOperations.updateFinishingMatrixRowQuantityPricesQuantityChange(quantityGroup.id, [], addQuantityIds);

    const updatedFinishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(
      finishingMatrix.id,
    );
    expect(updatedFinishingMatrixRowQuantityPrices.length).toBe(3);

    const updatedFinishingMatrixRowQuantityPricesWithAddedQuantity = updatedFinishingMatrixRowQuantityPrices.filter(
      (u) => u.quantityFk === quantity3.id,
    );
    expect(updatedFinishingMatrixRowQuantityPricesWithAddedQuantity.length).toBe(1);
    // eslint-disable-next-line max-len
    const updatedFinishingMatrixRowQuantityPriceWithAddedQuantity = updatedFinishingMatrixRowQuantityPricesWithAddedQuantity[0];

    expect(updatedFinishingMatrixRowQuantityPriceWithAddedQuantity.price).toBeNull();
  });
});

test('delete finishing matrices for product', async () => {
  const quantity = quantities[0];
  const quantity2 = quantities[1];
  const productQuantityIds = [quantity.id, quantity2.id];
  const option = options[0];
  const productMatrices = [
    [
      {
        optionId: [option.id],
        quantityGroup: [
          { id: quantity.id, price: '12' },
          { id: quantity2.id, price: '2' },
        ],
      },
    ],
  ];

  const { product, finishingMatrices } = await productTestHelper.createTestProductWithFinishingMatrices(
    productQuantityIds,
    productMatrices,
  );

  const finishingMatrixDetail = finishingMatrices[0];
  const finishingMatrix = await productOperations.getFinishingMatrixById(finishingMatrixDetail.id);
  expect(finishingMatrix.deleteFl).toBe(false);

  const finishingMatrixRows = await productOperations.getFinishingMatrixRowsForFinishingMatrix(finishingMatrix.id);
  expect(finishingMatrixRows.filter((f) => f.deleteFl === false).length).toBe(1);

  const finishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(finishingMatrix.id);
  expect(finishingMatrixRowQuantityPrices.length).toBe(2);

  await productOperations.deleteFinishingMatricesForProduct(product.id);
  const deleteFinishingMatrix = await productOperations.getFinishingMatrixById(finishingMatrix.id);
  expect(deleteFinishingMatrix.deleteFl).toBe(true);

  const deletedFinishingMatrixRows = await productOperations.getFinishingMatrixRowsForFinishingMatrix(finishingMatrix.id);
  expect(deletedFinishingMatrixRows.filter((d) => d.deleteFl === true).length).toBe(1);

  const deletedFinishingMatrixRowQuantityPrices = await productOperations.getFinishingMatrixRowQuantityPrices(
    finishingMatrix.id,
  );
  expect(deletedFinishingMatrixRowQuantityPrices.filter((d) => d.deleteFl === 1).length).toBe(2);
});

describe('get attribute type by type', () => {
  it('should return null if no attribute type exists with type', async () => {
    const attributeType = await productOperations.getAttributeTypeByType('test');
    expect(attributeType).toBeNull();
  });

  it('should return attribute type if attribute type exists with type', async () => {
    const attributeType = await productOperations.getAttributeTypeByType('Printing');
    expect(attributeType).not.toBeNull();
  });
});

describe('get quantity group by id', () => {
  it('should return null if no quantity group with id', async () => {
    const quantityGroup = await productOperations.getQuantityGroupById(0);
    expect(quantityGroup).toBeNull();
  });

  it('should return quantity group if id exists', async () => {
    const { quantityGroup } = await productTestHelper.createTestProductWithQuantities([]);
    const getQuantityGroup = await productOperations.getQuantityGroupById(quantityGroup.id);
    expect(getQuantityGroup).not.toBeNull();
  });
});

test('create quantity group item', async () => {
  const { quantityGroup } = await productTestHelper.createTestProductWithQuantities([]);
  const quantity = quantities[0];
  const quantityGroupItem = await productOperations.createQuantityGroupItem(quantityGroup.id, quantity.id);

  expect(quantityGroupItem).not.toBeNull();
  expect(quantityGroupItem.quantityGroupFk).toBe(quantityGroup.id);
  expect(quantityGroupItem.quantityFk).toBe(quantity.id);
  expect(quantityGroupItem.deleteFl).toBe(false);
  expect(quantityGroupItem.versionNo).toBe(1);
});

test('create option group items', async () => {
  const optionGroup = await productOperations.createOptionGroup();
  const option = options[0];
  const optionGroupItem = await productOperations.createOptionGroupItem(optionGroup.id, option.id);

  expect(optionGroupItem).not.toBeNull();
  expect(optionGroupItem.optionGroupFk).toBe(optionGroup.id);
  expect(optionGroupItem.optionFk).toBe(option.id);
  expect(optionGroupItem.deleteFl).toBe(false);
  expect(optionGroupItem.versionNo).toBe(1);
});

describe('get active product type by id', () => {
  it('should return null if no active product type with id', async () => {
    const productType = await productOperations.getActiveProductTypeById(0);
    expect(productType).toBeNull();
  });

  it('should return active product type if id exists', async () => {
    const productTypes = await productOperations.getAllProductTypes();
    const productType = productTypes[0];
    const getProductType = await productOperations.getActiveProductTypeById(productType.id);
    expect(getProductType).not.toBeNull();
  });
});

describe('get all active products', () => {
  it('should return empty if no active products', async () => {
    await productTestHelper.createTestProduct(false, false);
    const products = await productOperations.getAllActiveProducts();
    expect(products.length).toBe(0);
  });

  it('should return active products', async () => {
    await productTestHelper.createTestProduct(false, true);
    const products = await productOperations.getAllActiveProducts();
    expect(products.length).toBe(1);
  });
});

describe('get all products', () => {
  it('should return products even when inactive', async () => {
    await productTestHelper.createTestProduct(false, false);
    const products = await productOperations.getAllProducts();
    expect(products.length).toBe(1);
  });

  it('should return active products', async () => {
    await productTestHelper.createTestProduct(false, true);
    const products = await productOperations.getAllProducts();
    expect(products.length).toBe(1);
  });

  it('should return empty list when no products', async () => {
    const products = await productOperations.getAllProducts();
    expect(products.length).toBe(0);
  });
});

describe('create quantity', () => {
  it('should not create quantity if already exist and return existing quantity', async () => {
    const quantity = await productOperations.getQuantityByName('25');
    expect(quantity).not.toBeNull();

    const createdQuantity = await productOperations.createQuantity('25');
    expect(quantity.id).toBe(createdQuantity.id);
  });

  it("should create quantity if quantity doesn't exist", async () => {
    const quantity = await productOperations.getQuantityByName('1234');
    expect(quantity).toBeNull();

    const createdQuantity = await productOperations.createQuantity('1234');
    expect(createdQuantity).not.toBeNull();

    await productTestHelper.deleteQuantity(createdQuantity.id);
  });
});

describe('templates', () => {
  it('should create template successfully', async () => {
    const option = options[0];
    const body = {
      bleedAreaWidth: 10,
      bleedAreaHeight: 10,
      trimWidth: 10,
      trimHeight: 10,
      safeAreaHeight: 20,
      safeAreaWidth: 20,
      deleteFl: false,
      sizeOptionFk: option.id,
      versionNo: 1,
      pdfPath: 'pdfTemplate',
      jpegPath: 'jpgTemplate',
    };

    const template = await productOperations.createTemplate(body);
    expect(template).not.toBeNull();

    expect(template.bleedAreaHeight).toBe(body.bleedAreaHeight);
    expect(template.bleedAreaWidth).toBe(body.bleedAreaWidth);
    expect(template.trimWidth).toBe(body.trimWidth);
    expect(template.trimHeight).toBe(body.trimHeight);
    expect(template.safeAreaHeight).toBe(body.safeAreaHeight);
    expect(template.safeAreaWidth).toBe(body.safeAreaWidth);
    expect(template.deleteFl).toBe(body.deleteFl);
    expect(template.sizeOptionFk).toBe(body.sizeOptionFk);
    expect(template.versionNo).toBe(body.versionNo);
    expect(template.pdfPath).toBe(body.pdfPath);
    expect(template.jpegPath).toBe(body.jpegPath);
  });
});

describe('product activation and deactivation', () => {
  it('should return activated product', async () => {
    const product = await productTestHelper.createTestProduct(false, false);
    expect(product.deleteFl).toBe(true);
    expect(product.status).toBe('Incomplete');

    await productOperations.activateProduct(product.id);
    const activatedProduct = await productOperations.getProductById(product.id);

    expect(activatedProduct.deleteFl).toBe(false);
    expect(activatedProduct.status).toBe('Complete');
  });

  it('should return deactivated product', async () => {
    const product = await productTestHelper.createTestProduct(false, true);
    expect(product.deleteFl).toBe(false);

    await productOperations.deactivateProduct(product.id, true);
    const deactivatedProduct = await productOperations.getProductById(product.id);

    expect(deactivatedProduct.deleteFl).toBe(true);
  });
});

afterEach(async () => {
  await truncateTables([
    'optionGroupItems',
    'optionGroups',
    'priceMatrices',
    'priceMatrixRows',
    'priceMatrixRowQuantityPrices',
    'optionTypeGroups',
    'optionTypeGroupItems',
    'quantityGroups',
    'products',
    'finishingMatrices',
    'finishingMatrixRows',
    'finishingMatrixRowQuantityPrices',
    'quantityGroupItems',
  ]);
});
