const productOperations = require('../../utilty/products/productOperations');
const accountTestHelper = require('../helper/accountTestHelper');
const productTestHelper = require('../helper/productTestHelper');
const generalTestHelper = require('../helper/generalTestHelper');
const utilityHelper = require('../../utilty/general/utilityHelper');
const deliveryOperations = require('../../utilty/delivery/deliveryOperations');

// let productType;
// let quantity;
// const optionTypeName = 'Size';
// const productTypeName = 'Bookmarks';
// let optionType;

let agent;
beforeAll(async () => {
  // optionType = await productOperations.getOptionTypeByName(optionTypeName);

  // productType = await productOperations.getProductTypeByType(productTypeName);

  // quantity = await productOperations.getQuantityByName(25);

  const adminSetup = await accountTestHelper.setUpAdminAccountAndAgent();
  agent = adminSetup.agent;
});

describe('post /admin-dashboard/product/:id/save', () => {
  it('when product name is undefined or empty should receive 400 response', async () => {
    const response = await agent.post('/admin-dashboard/product/page1/save');
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe("'Product Name' must be set to save.");
  });

  it('when product name is empty or empty should receive 400 response', async () => {
    const response = await agent.post('/admin-dashboard/product/page1/save').send({ productName: '  ' });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe("'Product Name' must be set to save.");
  });

  it("when 'productId' is undefined and atleast the productName is defined and not empty save product succesfully making it inactive", async () => {
    const productName = 'ProductName';
    const response = await agent.post('/admin-dashboard/product/page1/save').send({ productName });
    expect(response.status).toBe(201);
    const productId = JSON.parse(response.body.id);
    expect(productId).not.toBeNull();

    const product = await productOperations.getProductById(productId);
    expect(product).not.toBeNull();
    expect(product.name).toBe(productName);
    expect(product.deleteFl).toBe(true);
  });

  it("when 'productId' is set not valid id, should return 400 response", async () => {
    const productName = 'ProductName';
    const response = await agent.post('/admin-dashboard/product/page1/save').send({ productName, productId: 0 });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe('Product no found.');
  });

  it("when 'productId' is set and is valid, should return update correctly", async () => {
    const productName = 'New Name';

    const product = await productTestHelper.createTestProduct(false);
    const response = await agent.post('/admin-dashboard/product/page1/save').send({ productName, productId: product.id });
    expect(response.status).toBe(200);

    const updatedProduct = await productOperations.getProductById(product.id);
    expect(updatedProduct.name).toBe(productName);
    expect(updatedProduct.status).toBe('Incomplete');
    expect(updatedProduct.deleteFl).toBe(true);
  });
});

describe('post /product/:id/clone', () => {
  it('when id is not valid product return error reponse 400', async () => {
    const response = await agent.post('/product/0/clone');
    expect(response.status).toBe(400);

    expect(JSON.parse(response.error.text).error).toBe('Product no found.');
  });

  it('when cloned product just has product details', async () => {
    const product = await productTestHelper.createTestProduct();

    const response = await agent.post(`/product/${product.id}/clone`);
    expect(response.status).toBe(200);

    const clonedProductId = JSON.parse(response.text).id;
    expect(clonedProductId).not.toBe(product.id);

    const clonedProduct = await productOperations.getProductById(clonedProductId);
    expect(clonedProduct).not.toBeNull();

    expect(clonedProduct.name).toBe(`${product.name} - Clone`);
    expect(clonedProduct.productTypeFk).toBe(product.productTypeFk);
    expect(clonedProduct.imagePath1).toBe(product.imagePath1);
    expect(clonedProduct.imagePath2).toBe(product.imagePath2);
    expect(clonedProduct.imagePath3).toBe(product.imagePath3);
    expect(clonedProduct.imagePath4).toBe(product.imagePath4);
    expect(clonedProduct.imagePath5).toBe(product.imagePath5);
    expect(clonedProduct.description1).toBe(product.description1);
    expect(clonedProduct.description2).toBe(product.description2);
    expect(clonedProduct.description3).toBe(product.description3);
    expect(clonedProduct.description4).toBe(product.description4);
    expect(clonedProduct.description5).toBe(product.description5);
    expect(clonedProduct.description6).toBe(product.description6);
    expect(clonedProduct.status).toBe('Incomplete');
    expect(clonedProduct.deleteFl).toBe(true);
  });

  it('when cloned product just has product details and quantities set', async () => {
    const quantities = await productOperations.getAllQuantities();
    const quantity = quantities[0];
    const productQuantityIds = [quantity.id];
    const { product } = await productTestHelper.createTestProductWithQuantities(productQuantityIds);

    const response = await agent.post(`/product/${product.id}/clone`);
    expect(response.status).toBe(200);

    const clonedProductId = JSON.parse(response.text).id;
    expect(clonedProductId).not.toBe(product.id);

    const clonedProduct = await productOperations.getProductById(clonedProductId);
    expect(clonedProduct).not.toBeNull();

    expect(clonedProduct.name).toBe(`${product.name} - Clone`);
    expect(clonedProduct.productTypeFk).toBe(product.productTypeFk);
    expect(clonedProduct.imagePath1).toBe(product.imagePath1);
    expect(clonedProduct.imagePath2).toBe(product.imagePath2);
    expect(clonedProduct.imagePath3).toBe(product.imagePath3);
    expect(clonedProduct.imagePath4).toBe(product.imagePath4);
    expect(clonedProduct.imagePath5).toBe(product.imagePath5);
    expect(clonedProduct.description1).toBe(product.description1);
    expect(clonedProduct.description2).toBe(product.description2);
    expect(clonedProduct.description3).toBe(product.description3);
    expect(clonedProduct.description4).toBe(product.description4);
    expect(clonedProduct.description5).toBe(product.description5);
    expect(clonedProduct.description6).toBe(product.description6);
    expect(clonedProduct.status).toBe('Incomplete');
    expect(clonedProduct.deleteFl).toBe(true);

    const clonedQuantityGroup = await productOperations.getQuantityGroupForProductId(clonedProduct.id);
    expect(clonedQuantityGroup).not.toBeNull();
    const clonedQuantityGroupItems = await productOperations.getQuantityGroupItemsByQuantityGroup(clonedQuantityGroup.id);
    const clonedQuantityIds = clonedQuantityGroupItems.map((c) => c.quantityFk);
    expect(clonedQuantityIds).toEqual(productQuantityIds);
  });

  it('when cloned product just has product details, quantities and price matrix set', async () => {
    const quantities = await productOperations.getAllQuantities();
    const quantity = quantities[0];
    const quantity2 = quantities[1];
    const productQuantityIds = [quantity.id, quantity2.id];

    const options = await productOperations.getAllOptions();
    const option = options[0];
    const option2 = options[1];
    const productOptionIds = [option.id, option2.id];
    const priceMatrixRows = [
      {
        optionIdGroup: [option.id],
        quantityGroup: [
          { id: quantity.id, price: '' },
          { id: quantity2.id, price: '5.00' },
        ],
      },

      {
        optionIdGroup: [option2.id],
        quantityGroup: [
          { id: quantity.id, price: '12' },
          { id: quantity2.id, price: '11.00' },
        ],
      },

    ];

    const {
      product, quantityGroup, priceMatrix, matrixRows,
    } = await productTestHelper.createTestProductWithPriceMatrix(
      productQuantityIds,
      productOptionIds,
      priceMatrixRows,
    );

    const response = await agent.post(`/product/${product.id}/clone`);
    expect(response.status).toBe(200);

    const clonedProductId = JSON.parse(response.text).id;
    expect(clonedProductId).not.toBe(product.id);

    const clonedProduct = await productOperations.getProductById(clonedProductId);
    expect(clonedProduct).not.toBeNull();

    expect(clonedProduct.name).toBe(`${product.name} - Clone`);
    expect(clonedProduct.productTypeFk).toBe(product.productTypeFk);
    expect(clonedProduct.imagePath1).toBe(product.imagePath1);
    expect(clonedProduct.imagePath2).toBe(product.imagePath2);
    expect(clonedProduct.imagePath3).toBe(product.imagePath3);
    expect(clonedProduct.imagePath4).toBe(product.imagePath4);
    expect(clonedProduct.imagePath5).toBe(product.imagePath5);
    expect(clonedProduct.description1).toBe(product.description1);
    expect(clonedProduct.description2).toBe(product.description2);
    expect(clonedProduct.description3).toBe(product.description3);
    expect(clonedProduct.description4).toBe(product.description4);
    expect(clonedProduct.description5).toBe(product.description5);
    expect(clonedProduct.description6).toBe(product.description6);
    expect(clonedProduct.status).toBe('Incomplete');
    expect(clonedProduct.deleteFl).toBe(true);

    const clonedQuantityGroupItems = await productOperations.getQuantityGroupItemsByQuantityGroup(quantityGroup.id);
    const clonedQuantityIds = clonedQuantityGroupItems.map((c) => c.quantityFk);
    expect(clonedQuantityIds).toEqual(productQuantityIds);

    const clonedPriceMatrix = await productOperations.getPriceMatrixForProductId(clonedProduct.id);
    expect(clonedPriceMatrix).not.toBeNull();
    expect(clonedPriceMatrix.id).not.toBe(priceMatrix.id);

    const matrixRowsDetails = matrixRows.map((m) => m.map((r) => ({
      quantity: r.quantity,
      options: r.options,
      orderNo: r.orderNo,
      price: r.price,
    })));

    const clonedProductMatrixRows = await productOperations.getPriceMatrixDetailsForProductId(clonedProduct.id);
    const clonedProductMatrixRowsDetails = clonedProductMatrixRows.map((m) => m.map((r) => ({
      quantity: r.quantity,
      options: r.options,
      orderNo: r.orderNo,
      price: r.price,
    })));
    expect(clonedProductMatrixRowsDetails).toEqual(matrixRowsDetails);
  });

  it('when cloned product just has product details, quantities and finishing matrix set', async () => {
    const quantities = await productOperations.getAllQuantities();
    const quantity = quantities[0];
    const quantity2 = quantities[1];
    const productQuantityIds = [quantity.id, quantity2.id];
    const options = await productOperations.getAllOptions();
    const option = options[0];
    const option2 = options[1];
    const productMatrices = [
      [{ optionId: [option.id], quantityGroup: [{ id: quantity.id, price: '12' }, { id: quantity2.id, price: '2' }] }, { optionId: [option2.id], quantityGroup: [{ id: quantity.id, price: '12' }, { id: quantity2.id, price: '1' }] }],
    ];

    const { product, quantityGroup, finishingMatrices } = await productTestHelper.createTestProductWithFinishingMatrices(
      productQuantityIds,
      productMatrices,
    );

    const response = await agent.post(`/product/${product.id}/clone`);
    expect(response.status).toBe(200);

    const clonedProductId = JSON.parse(response.text).id;
    expect(clonedProductId).not.toBe(product.id);

    const clonedProduct = await productOperations.getProductById(clonedProductId);
    expect(clonedProduct).not.toBeNull();

    expect(clonedProduct.name).toBe(`${product.name} - Clone`);
    expect(clonedProduct.productTypeFk).toBe(product.productTypeFk);
    expect(clonedProduct.imagePath1).toBe(product.imagePath1);
    expect(clonedProduct.imagePath2).toBe(product.imagePath2);
    expect(clonedProduct.imagePath3).toBe(product.imagePath3);
    expect(clonedProduct.imagePath4).toBe(product.imagePath4);
    expect(clonedProduct.imagePath5).toBe(product.imagePath5);
    expect(clonedProduct.description1).toBe(product.description1);
    expect(clonedProduct.description2).toBe(product.description2);
    expect(clonedProduct.description3).toBe(product.description3);
    expect(clonedProduct.description4).toBe(product.description4);
    expect(clonedProduct.description5).toBe(product.description5);
    expect(clonedProduct.description6).toBe(product.description6);
    expect(clonedProduct.status).toBe('Incomplete');
    expect(clonedProduct.deleteFl).toBe(true);

    const clonedQuantityGroupItems = await productOperations.getQuantityGroupItemsByQuantityGroup(quantityGroup.id);
    const clonedQuantityIds = clonedQuantityGroupItems.map((c) => c.quantityFk);
    expect(clonedQuantityIds).toEqual(productQuantityIds);

    const clonedFinishingMatricesDetails = await productOperations.getFinishingMatricesDetailsForProductId(clonedProduct.id);
    expect(clonedFinishingMatricesDetails.length).toBe(1);
    const finishingMatrixDetails = finishingMatrices.map((matrix) => {
      const { rows } = matrix;

      return rows.map((m) => ({
        optionId: m.optionId,
        orderNo: m.orderNo,
        price: m.price,
        quantity: m.quantity,
      }));
    });

    const clonedFinishingMatrixDetails = clonedFinishingMatricesDetails.map((matrix) => {
      const { rows } = matrix;

      return rows.map((m) => ({
        optionId: m.optionId,
        orderNo: m.orderNo,
        price: m.price,
        quantity: m.quantity,
      }));
    });

    expect(finishingMatrixDetails).toEqual(clonedFinishingMatrixDetails);
  });

  it('when cloned product just has product details, delivery options', async () => {
    const { product } = await productTestHelper.createTestProductWithDelivery();

    const response = await agent.post(`/product/${product.id}/clone`);
    expect(response.status).toBe(200);

    const clonedProductId = JSON.parse(response.text).id;
    expect(clonedProductId).not.toBe(product.id);

    const clonedProduct = await productOperations.getProductById(clonedProductId);
    expect(clonedProduct).not.toBeNull();

    expect(clonedProduct.name).toBe(`${product.name} - Clone`);
    expect(clonedProduct.productTypeFk).toBe(product.productTypeFk);
    expect(clonedProduct.imagePath1).toBe(product.imagePath1);
    expect(clonedProduct.imagePath2).toBe(product.imagePath2);
    expect(clonedProduct.imagePath3).toBe(product.imagePath3);
    expect(clonedProduct.imagePath4).toBe(product.imagePath4);
    expect(clonedProduct.imagePath5).toBe(product.imagePath5);
    expect(clonedProduct.description1).toBe(product.description1);
    expect(clonedProduct.description2).toBe(product.description2);
    expect(clonedProduct.description3).toBe(product.description3);
    expect(clonedProduct.description4).toBe(product.description4);
    expect(clonedProduct.description5).toBe(product.description5);
    expect(clonedProduct.description6).toBe(product.description6);
    expect(clonedProduct.status).toBe('Incomplete');
    expect(clonedProduct.deleteFl).toBe(true);

    const clonedProductDeliveries = await deliveryOperations.getAllDeliveryOptionsForProduct(clonedProduct.id);
    const productDeliveries = await deliveryOperations.getAllDeliveryOptionsForProduct(product.id);

    expect(clonedProductDeliveries.map((d) => ({ price: d.price, deliveryTypeFk: d.deliveryTypeFk }))).toEqual(
      productDeliveries.map((d) => ({ price: d.price, deliveryTypeFk: d.deliveryTypeFk })),
    );
  });
});

afterEach(async () => {
  await generalTestHelper.truncateTables([
    'products',
    'quantityGroupItems',
    'quantityGroups',
    'optionTypeGroups',
    'optionTypeGroupItems',
    'optionGroupItems',
    'optionGroups',
    'priceMatrices',
    'priceMatrixRows',
    'priceMatrixRowQuantityPrices',
    'finishingMatrices',
    'finishingMatrixRows',
    'finishingMatrixRowQuantityPrices',
    'productDeliveries',
  ]);
  await utilityHelper.deleteS3Folder('test/');
});

afterAll(async () => {
  await generalTestHelper.truncateTables(['accounts']);
});
