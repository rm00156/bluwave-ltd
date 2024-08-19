function SaleProducts(sequelize, Sequelize) {
  const SaleProduct = sequelize.define('saleProduct', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    saleFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'sales',
        key: 'id',
      },
    },

    productFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },

    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

  }, {
    timestamps: false,
  });

  return SaleProduct;
}

module.exports = SaleProducts;
