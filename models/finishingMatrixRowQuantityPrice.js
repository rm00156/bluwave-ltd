const { DataTypes } = require('sequelize');

function FinishingMatrixRowQuantityPrices(sequelize, Sequelize) {
  const FinishingMatrixRowQuantityPrice = sequelize.define('finishingMatrixRowQuantityPrice', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    finishingMatrixRowFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'finishingMatrixRows',
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

  return FinishingMatrixRowQuantityPrice;
}

module.exports = FinishingMatrixRowQuantityPrices;
