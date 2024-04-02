const homePageOptionHelper = require('../helper/homePageOptionHelper');
const homePageOperations = require('../../utility/homePage/homePageOperations');
const productOperations = require('../../utility/products/productOperations');
const { setUpTestDb } = require('../helper/generalTestHelper');

beforeAll(async () => {
  await setUpTestDb();
}, 60000);

beforeEach(async () => {
  await homePageOptionHelper.createHomePageOptions();
});

afterEach(async () => {
  await homePageOptionHelper.deleteHomePageOptions();
});

describe('unit tests for homePageOperations', () => {
  it('when id exists get homePageOptionById should return homePageOption', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    const homePageOption = homePageOptions[0];

    const getHomePageOption = await homePageOperations.getHomePageOptionById(homePageOption.id);

    expect(getHomePageOption).toEqual(homePageOption);
  });

  it("when id doesn't exists get homePageOptionById should return null", async () => {
    const getHomePageOption = await homePageOperations.getHomePageOptionById(0);

    expect(getHomePageOption).toBeNull();
  });

  it('when update homePageOption by id details updated and status active', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    const homePageOption = homePageOptions[0];

    const updateData = {
      description: 'new description',
      productTypeFk: 2,
      imagePath: 'new imagePath',
    };

    await homePageOperations.updateHomePageOption(homePageOption.id, updateData, true);
    const updatedHomePageOption = await homePageOperations.getHomePageOptionById(homePageOption.id);

    expect(updatedHomePageOption.description).toBe(updateData.description);
    expect(updatedHomePageOption.productTypeFk).toBe(updateData.productTypeFk);
    expect(updatedHomePageOption.imagePath).toBe(updateData.imagePath);
    expect(updatedHomePageOption.status).toBe('Active');
  });

  it('when update homePageOption by id details updated and status inactive', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    const homePageOption = homePageOptions[0];

    const updateData = {
      description: 'new description',
      productTypeFk: 2,
      imagePath: 'new imagePath',
    };

    await homePageOperations.updateHomePageOption(homePageOption.id, updateData, false);
    const updatedHomePageOption = await homePageOperations.getHomePageOptionById(homePageOption.id);

    expect(updatedHomePageOption.description).toBe(updateData.description);
    expect(updatedHomePageOption.productTypeFk).toBe(updateData.productTypeFk);
    expect(updatedHomePageOption.imagePath).toBe(updateData.imagePath);
    expect(updatedHomePageOption.status).toBe('Inactive');
  });

  it('get home page options returns all home page options', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    expect(homePageOptions.length).toBe(8);
  });

  it('get home page option details returns all home page options correctly', async () => {
    const homePageOptionDetails = await homePageOperations.getHomePageOptionDetails();
    const homePageOptionDetailsWithProductType = homePageOptionDetails.filter((h) => h.productType !== undefined);
    const homePageOptionDetailsWithNoProductType = homePageOptionDetails.filter((h) => h.productType === undefined);

    expect(homePageOptionDetailsWithProductType.length).toBe(1);
    expect(homePageOptionDetailsWithNoProductType.length).toBe(7);

    const homePageOptionDetail = homePageOptionDetailsWithProductType[0];
    const productType = await productOperations.getProductTypeById(homePageOptionDetail.productTypeFk);

    expect(homePageOptionDetail.productType).toBe(productType.productType);
  });

  it('get all active product types available for a homePageOption', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    const homePageOption = homePageOptions[1];

    const updateData = {
      description: 'new description',
      productTypeFk: 2,
      imagePath: 'new imagePath',
    };

    await homePageOperations.updateHomePageOption(homePageOption.id, updateData, false);

    const available = await homePageOperations.getAllAvailableActiveProductTypes(updateData.productTypeFk);
    const productTypes = await productOperations.getAllActiveProductTypes();

    expect(available.length).toBe(productTypes.length - 1);

    const productTypesWithIdOf2 = available.filter((a) => a.id === homePageOptions[0].id);
    expect(productTypesWithIdOf2.length).toBe(0);
  });

  it('get home page option by product type id', async () => {
    const homePageOptions = await homePageOperations.getHomePageOptions();
    const homePageOption = homePageOptions[0];

    const getHomePageOption = await homePageOperations.getHomePageOptionByProductTypeId(homePageOption.productTypeFk);

    expect(getHomePageOption).toEqual(homePageOption);
  });
});
