const { DataTypes } = require('sequelize');

function PriceMatrixRowQuantityPrices(sequelize, Sequelize) {
  const PriceMatrixRowQuantityPrice = sequelize.define('priceMatrixRowQuantityPrice', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    priceMatrixRowFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'priceMatrixRows',
        key: 'id',
      },
    },

    quantityFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'quantities',
        key: 'id',
      },
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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

  return PriceMatrixRowQuantityPrice;
}

module.exports = PriceMatrixRowQuantityPrices;
