const { DataTypes } = require('sequelize');

function Products(sequelize, Sequelize) {
  const Product = sequelize.define('product', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    name: {
      type: Sequelize.STRING,
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

    image1Path: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    image2Path: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    image3Path: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    image4Path: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    image5Path: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    subDescriptionTitle: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    subDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    descriptionPoint1: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    descriptionPoint2: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    descriptionPoint3: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    descriptionPoint4: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    descriptionPoint5: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    descriptionPoint6: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM('Incomplete', 'Complete'),
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

  return Product;
}

module.exports = Products;
