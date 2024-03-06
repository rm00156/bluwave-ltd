function TwoFactorAuths(sequelize, Sequelize) {
  const TwoFactorAuth = sequelize.define('twoFactorAuth', {

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

    secret: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    qrCode: {
      type: Sequelize.TEXT,
      allowNull: false,
    },

    authenticatedFl: {
      type: Sequelize.BOOLEAN,
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

  return TwoFactorAuth;
}

module.exports = TwoFactorAuths;
