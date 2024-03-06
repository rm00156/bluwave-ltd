function FaqTypes(sequelize, Sequelize) {
  const FaqType = sequelize.define('faqType', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    faqType: {
      type: Sequelize.STRING,
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

  return FaqType;
}

module.exports = FaqTypes;
