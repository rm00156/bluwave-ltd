const Sequelize = require('sequelize');
const models = require('../../models');
const productOperations = require('../../utilty/products/productOperations');

async function deleteProductsById(ids) {
  await models.product.destroy({
    where: {
      id: { [Sequelize.Op.in]: ids },
    },
  });
}

async function createTestProduct(complete) {
  return productOperations.createDefaultProduct('ProductName', 1, complete ? 'Complete' : 'Incomplete');
}

module.exports = {
  createTestProduct,
  deleteProductsById,
};
