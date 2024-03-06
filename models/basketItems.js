const { DataTypes } = require('sequelize');

function BasketItems(sequelize, Sequelize) {
  const BasketItem = sequelize.define('basketItem', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    accountFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'accounts',
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

    optionGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'optionGroups',
        key: 'id',
      },
    },

    finishingOptionGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'optionGroups',
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

    fileGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'fileGroups',
        key: 'id',
      },
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    purchaseBasketFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'purchaseBaskets',
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

  return BasketItem;
}

module.exports = BasketItems;
