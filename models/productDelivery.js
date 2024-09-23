const { DataTypes } = require('sequelize');

function ProductDeliveries(sequelize, Sequelize) {
  const ProductDelivery = sequelize.define('productDelivery', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    productFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },

    collectionWorkingDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    standardPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    standardWorkingDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    expressPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    expressWorkingDays: {
      type: Sequelize.INTEGER,
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

  return ProductDelivery;
}

module.exports = ProductDeliveries;
