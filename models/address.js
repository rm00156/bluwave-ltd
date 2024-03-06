function Addresses(sequelize, Sequelize) {
  const Address = sequelize.define('address', {
    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    accountFk: {
      type: Sequelize.INTEGER,
      references: {
        model: 'accounts',
        key: 'id',
      },
    },

    addressLine1: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    addressLine2: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    city: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    postCode: {
      type: Sequelize.STRING,
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

  return Address;
}

module.exports = Addresses;
