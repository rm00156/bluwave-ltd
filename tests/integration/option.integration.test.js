const Sequelize = require('sequelize');
const productOperations = require('../../utility/products/productOperations');
const accountTestHelper = require('../helper/accountTestHelper');
const { truncateTables, setUpTestDb } = require('../helper/generalTestHelper');

const models = require('../../models');

// let adminAccount;
let productType;
let quantity;
const optionTypeName = 'Size';
const productTypeName = 'Bookmarks';
let optionType;

let agent;
beforeAll(async () => {
  await setUpTestDb();
  optionType = await productOperations.getOptionTypeByName(optionTypeName);

  productType = await productOperations.getProductTypeByType(productTypeName);

  quantity = await productOperations.getQuantityByName(25);

  const adminSetup = await accountTestHelper.setUpAdminAccountAndAgent();
  // adminAccount = adminSetup.adminAccount;
  agent = adminSetup.agent;
}, 60000);

describe('post /option/:id/update', () => {
  it('option not found when invalid option id specified', async () => {
    // console.log(req);
    const response = await agent.post('/option/0/update');
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe('Option not found');
  });

  it('no change made when same name used to update option', async () => {
    const optionName = 'option';
    const exisitingOption = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    const response = await agent
      .post(`/option/${exisitingOption.id}/update`)
      .send({ name: optionName });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe('No Change made.');
  });

  it('option with this name already exists for option type if same name already exists for the optionType', async () => {
    const otherOptionName = 'otherOption';
    await productOperations.createOption(otherOptionName, optionType.id);

    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );

    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: otherOptionName });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.error.text).error).toBe(
      'Option with this name already exists for this Option Type.',
    );
  });

  it('if withWarnings set to true, return error if option being used currently in printing attribute of product', async () => {
    const productName = 'name';
    const product = await productOperations.createDefaultProduct(
      productName,
      productType.id,
      'Complete',
      false,
    );

    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    await productOperations.createQuantityGroupAndSetQuantities(product.id, [
      quantity.id,
    ]);
    const priceMatrix = await productOperations.createPriceMatrix(
      product.id,
      [option.id],
      true,
    );

    const rows = [
      {
        optionIdGroup: [option.id],
        quantityGroup: [{ id: quantity.id, price: '' }],
      },
    ];

    await productOperations.createPriceMatrixRowsAndQuantityPrices(
      priceMatrix.id,
      rows,
    );

    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: 'new name', withWarnings: 'true' });
    expect(response.status).toBe(500);
  });

  it('if withWarnings set to true, return error if option being used currently in finishing attribute of product', async () => {
    const productName = 'name';
    const product = await productOperations.createDefaultProduct(
      productName,
      productType.id,
      'Complete',
      false,
    );

    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    await productOperations.createQuantityGroupAndSetQuantities(product.id, [
      quantity.id,
    ]);

    await productOperations.createFinishingMatrices(product.id, [
      [
        {
          quantityGroup: [{ id: quantity.id, price: '' }],
          optionId: [option.id],
        },
      ],
    ]);

    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: 'new name', withWarnings: 'true' });
    expect(response.status).toBe(500);
  });

  it('if withWarnings set to false, and option being used currently in finishing attribute of product return 200 and update finishing matrix row', async () => {
    const productName = 'name';
    const product = await productOperations.createDefaultProduct(
      productName,
      productType.id,
      'Complete',
      false,
    );

    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    const quantityGroup = await productOperations.createQuantityGroupAndSetQuantities(product.id, [
      quantity.id,
    ]);

    await productOperations.createFinishingMatrices(product.id, [
      [
        {
          quantityGroup: [{ id: quantity.id, price: '' }],
          optionId: [option.id],
        },
      ],
    ]);

    const newName = 'new name';
    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: newName, withWarnings: 'false' });
    expect(response.status).toBe(200);

    const finishingMatrixRows = await productOperations.getFinishingMatrixRowsForQuantityGroup(
      quantityGroup.id,
    );

    expect(
      finishingMatrixRows.filter((f) => f.optionFk === option.id).length,
    ).toBe(0);
    expect(finishingMatrixRows.length).toBe(1);

    const finishingMatrixRow = finishingMatrixRows[0];
    const newFinishingMatrixRowOption = await productOperations.getOptionById(
      finishingMatrixRow.optionFk,
    );
    expect(newFinishingMatrixRowOption.name).toBe(newName);
  });

  it('if withWarnings set to false, and option being used currently in printing attribute of product return 200 and update optionGroupItem', async () => {
    const productName = 'name';
    const product = await productOperations.createDefaultProduct(
      productName,
      productType.id,
      'Complete',
      false,
    );

    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    const quantityGroup = await productOperations.createQuantityGroupAndSetQuantities(product.id, [
      quantity.id,
    ]);

    const priceMatrix = await productOperations.createPriceMatrix(
      product.id,
      [option.id],
      true,
    );

    const rows = [
      {
        optionIdGroup: [option.id],
        quantityGroup: [{ id: quantity.id, price: '' }],
      },
    ];

    await productOperations.createPriceMatrixRowsAndQuantityPrices(
      priceMatrix.id,
      rows,
    );

    const newName = 'new name';
    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: newName, withWarnings: 'false' });
    expect(response.status).toBe(200);

    const priceMatrixRows = await productOperations.getPriceMatrixRowsForQuantityGroup(
      quantityGroup.id,
    );
    const priceMatrixRow = priceMatrixRows[0];

    const priceMatrixRowOptionGroupItems = await productOperations.getOptionGroupItemsForOptionGroup(
      priceMatrixRow.optionGroupFk,
    );
    expect(priceMatrixRowOptionGroupItems.length).toBe(1);

    const optionGroupItem = priceMatrixRowOptionGroupItems[0];

    expect(optionGroupItem.name).toBe(newName);
  });

  it('updates name when there is no links to a product', async () => {
    const optionName = 'option';
    const option = await productOperations.createOption(
      optionName,
      optionType.id,
    );
    const newName = 'new name';
    const response = await agent
      .post(`/option/${option.id}/update`)
      .send({ name: newName, withWarnings: 'false' });
    expect(response.status).toBe(200);

    const oldOption = await productOperations.getOptionById(option.id);
    expect(oldOption).toBeNull();
    const newOptionId = JSON.parse(response.text).id;
    expect(newOptionId).not.toBeNull();

    const newOption = await productOperations.getOptionById(newOptionId);
    expect(newOption).not.toBeNull();
    expect(newOption.name).toBe(newName);
  });
});

afterEach(async () => {
  await truncateTables(['products', 'quantityGroupItems', 'quantityGroups', 'finishingMatrices',
    'finishingMatrixRows', 'optionGroupItems', 'priceMatrixRowQuantityPrices', 'priceMatrices', 'priceMatrixRows']);
  await models.option.update(
    {
      deleteFl: true,
    },
    {
      where: {
        name: {
          [Sequelize.Op.in]: ['option', 'otherOption', 'new name'],
        },
        deleteFl: false,
      },
    },
  );
});

afterAll(async () => {
  await truncateTables(['accounts']);
  // accountTestHelper.closeRedisClientConnection();
});
