function Refunds(sequelize, Sequelize) {
  const Refund = sequelize.define('refund', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    refundTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'refundTypes',
        key: 'id',
      },
    },

    createdDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    amount: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    purchaseBasketFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

  return Refund;
}

module.exports = Refunds;
