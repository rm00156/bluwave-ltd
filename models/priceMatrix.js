const { DataTypes } = require('sequelize');

function PriceMatrices(sequelize, Sequelize) {
  const PriceMatrix = sequelize.define('priceMatrix', {

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

    status: {
      type: DataTypes.ENUM('Incomplete', 'Complete'),
      allowNull: false,
    },

    optionTypeGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'optionTypeGroups',
        key: 'id',
      },
    },

    quantityGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'quantityGroups',
        key: 'id',
      },
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

  return PriceMatrix;
}

module.exports = PriceMatrices;
