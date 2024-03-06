function Cookies(sequelize, Sequelize) {
  const Cookie = sequelize.define('cookie', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    accountFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      referenes: {
        model: 'accounts',
        key: 'id',
      },
    },

    createdDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    expirationDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    acceptedFl: {
      type: Sequelize.BOOLEAN,
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

  return Cookie;
}

module.exports = Cookies;
