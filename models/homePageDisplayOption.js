const { DataTypes } = require('sequelize');

function HomePageDisplayOptions(sequelize, Sequelize) {
  const HomePageDisplayOption = sequelize.define('homePageDisplayOption', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    orderNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    productTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'productTypes',
        key: 'id',
      },
    },

    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    imagePath: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
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

  }, {
    timestamps: false,
  });

  return HomePageDisplayOption;
}

module.exports = HomePageDisplayOptions;
