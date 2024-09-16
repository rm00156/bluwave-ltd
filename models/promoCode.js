function PromoCodes(sequelize, Sequelize) {
  const PromoCode = sequelize.define(
    'promoCode',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      fromDt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      toDt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      promoCodeTypeFk: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'promoCodeTypes',
          key: 'id',
        },
      },

      percentage: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },

      maxUses: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },

      usedCount: {
        allowNull: false,
        type: Sequelize.INTEGER,
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
    },
    {
      timestamps: false,
    },
  );

  return PromoCode;
}

module.exports = PromoCodes;
