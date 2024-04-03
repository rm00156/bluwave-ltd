const path = require('path');
const homePageOptionHelper = require('../helper/homePageOptionHelper');
const utilityHelper = require('../../utility/general/utilityHelper');
const { truncateTables, setUpTestDb } = require('../helper/generalTestHelper');

const accountTestHelper = require('../helper/accountTestHelper');
const homePageOperations = require('../../utility/homePage/homePageOperations');
const productOperations = require('../../utility/products/productOperations');

let agent;

beforeAll(async () => {
  await setUpTestDb();

  const adminSetup = await accountTestHelper.setUpAdminAccountAndAgent();
  agent = adminSetup.agent;
}, 60000);

beforeEach(async () => {
  await homePageOptionHelper.createHomePageOptions();
});

describe('put /home-page-option/:id/remove', () => {
  it('if option not found error response 400', async () => {
    const response = await agent.put('/home-page-option/0/remove');
    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe('No Home page option found with id 0.');
  });

  it('option has been reset where all values are cleared and status is inactive', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent.put(`/home-page-option/${homePageOption.id}/remove`);
    expect(response.status).toBe(200);
    const updatedHomePageOption = await homePageOperations.getHomePageOptionById(homePageOption.id);
    expect(updatedHomePageOption.description).toBeNull();
    expect(updatedHomePageOption.productTypeFk).toBeNull();
    expect(updatedHomePageOption.imagePath).toBeNull();
    expect(updatedHomePageOption.status).toBe('Inactive');
  });
});

describe('put /home-page-option/:id/update', () => {
  it('if option not found error response 400', async () => {
    const response = await agent.put('/home-page-option/0/update');
    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe('No Home page option found with id 0.');
  });

  it('when productType not set return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent.put(`/home-page-option/${homePageOption.id}/update`);

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe("'productTypeId' must be set.");
  });

  it('when description not set return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: homePageOption.productTypeFk });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe("'description' must be set.");
  });

  it('when description is empty field set return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: homePageOption.productTypeFk, description: '  ' });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe("'description' must be set.");
  });

  it('when no image set for option with no image return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(2);

    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: 2, description: 'new description' });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe('No image has been set.');
  });

  it('when product type set to product type of an existing option return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(2);
    const productTypeId = 1;
    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId, description: 'new description' });

    expect(response.status).toBe(400);

    const existingOption = await homePageOperations.getHomePageOptionById(1);
    const productType = await productOperations.getProductTypeById(productTypeId);
    expect(JSON.parse(response.text).error).toBe(`Home Page Option at position ${existingOption.orderNo} is already using '${productType.productType}'`);
  });

  it('when no changes have been made return error response 400', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: homePageOption.productTypeFk, description: homePageOption.description });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe('No changes made.');
  });

  it('when productTypeId is not a valid id', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);

    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: 0, description: homePageOption.description });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.text).error).toBe('No Product Type with id 0.');
  });

  it('when updated with no update to image', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);
    const newProductTypeId = 2;
    const newDescription = 'new description';
    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .send({ productTypeId: newProductTypeId, description: newDescription });

    expect(response.status).toBe(200);

    const updatedHomePageOption = await homePageOperations.getHomePageOptionById(1);
    expect(updatedHomePageOption.description).toBe(newDescription);
    expect(updatedHomePageOption.productTypeFk).toBe(newProductTypeId);
    expect(updatedHomePageOption.imagePath).toBe(homePageOption.imagePath);
    expect(updatedHomePageOption.status).toBe('Active');
  });

  it('when updated with image', async () => {
    const homePageOption = await homePageOperations.getHomePageOptionById(1);
    const newProductTypeId = 2;
    const newDescription = 'new description';
    const response = await agent
      .put(`/home-page-option/${homePageOption.id}/update`)
      .field('productTypeId', newProductTypeId)
      .field('description', newDescription)
      .attach('image', path.join(__dirname, './flyer.svg'));

    expect(response.status).toBe(200);

    const updatedHomePageOption = await homePageOperations.getHomePageOptionById(1);
    expect(updatedHomePageOption.description).toBe(newDescription);
    expect(updatedHomePageOption.productTypeFk).toBe(newProductTypeId);
    expect(updatedHomePageOption.imagePath).not.toBe(homePageOption.imagePath);
    expect(updatedHomePageOption.imagePath).not.toBe('');
    expect(updatedHomePageOption.status).toBe('Active');
  });
});

afterAll(async () => {
  await truncateTables(['accounts']);
  // accountTestHelper.closeRedisClientConnection();
});

afterEach(async () => {
  await homePageOptionHelper.deleteHomePageOptions();
  await utilityHelper.deleteS3Folder('test/');
});
