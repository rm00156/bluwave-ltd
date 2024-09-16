function PromoCodeProducts(sequelize, Sequelize) {
  const PromoCodeProduct = sequelize.define('promoCodeProduct', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    promoCodeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'promoCodes',
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

  return PromoCodeProduct;
}

module.exports = PromoCodeProducts;
