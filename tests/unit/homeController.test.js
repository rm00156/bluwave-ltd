const homePageOptionHelper = require('../helper/homePageOptionHelper');
const homeController = require('../../controllers/HomeController');

let homePageOptions;
beforeAll(async () => {
  homePageOptions = await homePageOptionHelper.createHomePageOptions();
});

describe('display home page options correctly', () => {
  it('parse home page options should load properly and return correct values', async () => {
    const result = await homeController.parseHomePageOptions(1, 4, homePageOptions);
    expect(result.length).toBe(1);
    const optionDetail = result[0];
    expect(optionDetail.productType.id).toBe(homePageOptions.productTypeFk1);
    expect(optionDetail.imagePath).toBe(homePageOptions.imagePath1);
    expect(optionDetail.description).toBe(homePageOptions.description1);
  });
});

afterAll(async () => {
  await homePageOptionHelper.deleteHomePageOptions();
});
