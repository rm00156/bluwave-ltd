const productOperations = require('../../utilty/products/productOperations');
const accountTestHelper = require('../helper/accountTestHelper');
const productTestHelper = require('../helper/productTestHelper');
const utilityHelper = require('../../utilty/general/utilityHelper');

let adminAccount;
// let productType;
// let quantity;
// const optionTypeName = 'Size';
// const productTypeName = 'Bookmarks';
// let optionType;
let productIds;

let agent;
beforeAll(async () => {
  // optionType = await productOperations.getOptionTypeByName(optionTypeName);

  // productType = await productOperations.getProductTypeByType(productTypeName);

  // quantity = await productOperations.getQuantityByName(25);

  const adminSetup = await accountTestHelper.setUpAdminAccountAndAgent();
  adminAccount = adminSetup.adminAccount;
  agent = adminSetup.agent;
});

beforeEach(() => {
  productIds = [];
});

describe('post /admin_dashboard/product/:id/save', () => {
  it('when product name is undefined or empty should receive 400 response', async () => {
    const response = await agent.post('/admin_dashboard/product/page1/save');
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe(
      "'Product Name' must be set to save.",
    );
  });

  it('when product name is empty or empty should receive 400 response', async () => {
    const response = await agent
      .post('/admin_dashboard/product/page1/save')
      .send({ productName: '  ' });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe(
      "'Product Name' must be set to save.",
    );
  });

  it("when 'productId' is undefined and atleast the productName is defined and not empty save product succesfully making it inactive", async () => {
    const productName = 'ProductName';
    const response = await agent
      .post('/admin_dashboard/product/page1/save')
      .send({ productName });
    expect(response.status).toBe(201);
    const productId = JSON.parse(response.body.id);
    expect(productId).not.toBeNull();

    const product = await productOperations.getProductById(productId);
    expect(product).not.toBeNull();
    expect(product.name).toBe(productName);
    expect(product.deleteFl).toBe(true);
    productIds = [product.id];
  });

  it("when 'productId' is set not valid id, should return 400 response", async () => {
    const productName = 'ProductName';
    const response = await agent
      .post('/admin_dashboard/product/page1/save')
      .send({ productName, productId: 0 });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe(
      'Product no found.',
    );
  });

  it("when 'productId' is set and is valid, should return update correctly", async () => {
    const productName = 'New Name';

    const product = await productTestHelper.createTestProduct(false);
    const response = await agent
      .post('/admin_dashboard/product/page1/save')
      .send({ productName, productId: product.id });
    expect(response.status).toBe(200);

    const updatedProduct = await productOperations.getProductById(product.id);
    expect(updatedProduct.name).toBe(productName);
    expect(updatedProduct.status).toBe('Incomplete');
    expect(updatedProduct.deleteFl).toBe(true);
    productIds = [product.id];
  });

  //   it("when 'productId' is set and is valid, should return update correctly", async () => {
  //     const productName = 'New Name';
  //     const descriptionPoint1 = 'Hello';
  //     const descriptionPoint2 = 'Bye';
  //     const descriptionPoint3 = 'Hi';
  //     const bulletPoints = `${descriptionPoint1},${descriptionPoint2},${descriptionPoint3}`;

  //     const product = await productTestHelper.createTestProduct(false);
  //     // try {
  //     const response = await agent
  //       .post('/admin_dashboard/product/page1/save')
  //       .field('productName', productName)
  //       .field('productId', product.id)
  //       .field('bulletPoints', bulletPoints)
  //       .attach('file', 'test/flyer.svg');
  //     expect(response.status).toBe(200);
  //     // } catch (err) {
  //     //   console.log(err)
  //     // }

//     const updatedProduct = await productOperations.getProductById(product.id);
//     expect(updatedProduct.name).toBe(productName);
//     expect(updatedProduct.status).toBe('Incomplete');
//     expect(updatedProduct.descriptionPoint1).toBe(descriptionPoint1);
//     expect(updatedProduct.descriptionPoint2).toBe(descriptionPoint2);
//     expect(updatedProduct.descriptionPoint3).toBe(descriptionPoint3);
//     expect(updatedProduct.deleteFl).toBe(true);
//     expect(updatedProduct.imagePath1).not.toBeNull();
//     console.log(updatedProduct.imagePath1);
//     productIds = [product.id];
//   });
});

afterEach(async () => {
  if (productIds.length > 0) await productTestHelper.deleteProductsById(productIds);
  await utilityHelper.deleteS3Folder('test/');
});

afterAll(async () => {
  await accountTestHelper.deleteAccountById(adminAccount.id);
});
