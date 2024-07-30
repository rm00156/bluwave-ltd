function DiscountProductGroups(sequelize, Sequelize) {
    const DiscountProductGroup = sequelize.define('discountProductGroup', {
  
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

      quantityFk: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'quantities',
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
  
    return DiscountProductGroup;
  }
  
  module.exports = DiscountProductGroups;
  