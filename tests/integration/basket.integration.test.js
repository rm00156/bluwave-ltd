const logger = require('pino')();
const path = require('path');
const { setUpCustomerAccountAndAgent } = require('../helper/accountTestHelper');
const { truncateTables, setUpTestDb } = require('../helper/generalTestHelper');
const {
  getAllQuantities,
} = require('../../utility/products/productOperations');
const {
  getFileGroupItemById,
} = require('../../utility/basket/basketOperations');
const { createTestBasketItem } = require('../helper/basketTestHelper');

let agent;
let quantities;
beforeAll(async () => {
  await setUpTestDb();
  quantities = await getAllQuantities();
  const customerSetup = await setUpCustomerAccountAndAgent();
  agent = customerSetup.agent;
}, 60000);

describe('upload design for basket item', () => {
  it('should return upload file when fileGroup does not exist', async () => {
    const quantity = quantities[0];
    const price = '5.00';
    try {
      const basketItem = await createTestBasketItem([{ id: quantity.id, price }]);
      const response = await agent
        .post('/design-upload')
        .field('basketItemId', basketItem.id)
        .attach('file', path.join(__dirname, './flyer.svg'));
      expect(response.status).toBe(200);
      const { id } = JSON.parse(response.text);
      expect(id).not.toBeNull();
      const fileGroupItem = await getFileGroupItemById(id);
      expect(fileGroupItem).not.toBeNull();
    } catch (err) {
      logger.error(err);
    }
  });
});

afterAll(async () => {
  await truncateTables(['accounts', 'basketItems',
    'fileGroups',
    'fileGroupItems',
    'optionGroups',
    'optionGroupItems',
    'priceMatrices',
    'priceMatrixRows',
    'priceMatrixRowQuantityPrices',
    'products',
    'quantityGroups',
    'quantityGroupItems']);
});
