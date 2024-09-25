const { DataTypes } = require('sequelize');

function FreeDeliveries(sequelize, Sequelize) {
  const FreeDelivery = sequelize.define(
    'freeDelivery',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      spendOver: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      deleteFl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },

      versionNo: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: false,
    },
  );

  return FreeDelivery;
}

module.exports = FreeDeliveries;
