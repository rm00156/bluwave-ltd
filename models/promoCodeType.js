const { DataTypes } = require('sequelize');

function PromoCodeTypes(sequelize, Sequelize) {
  const PromoCodeType = sequelize.define('promoCodeType', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    promoCodeType: {
      type: DataTypes.ENUM('BOGO', 'Delivery', 'SpecificBundle', 'Bundle'),
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

  return PromoCodeType;
}

module.exports = PromoCodeTypes;
