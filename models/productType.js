function ProductTypes(sequelize, Sequelize) {
  const ProductType = sequelize.define('productType', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    productType: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    bannerPath: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

  }, {
    timestamps: false,
  });

  return ProductType;
}

module.exports = ProductTypes;
