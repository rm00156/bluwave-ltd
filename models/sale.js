function Sales(sequelize, Sequelize) {
    const Sale = sequelize.define('sale', {
  
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
  
      fromDt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      toDt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
  
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
  
      productFk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
      },

      percentage: {
        type: Sequelize.INTEGER,
        allowNull: false
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
  
    return Sale;
  }
  
  module.exports = Sales;
  