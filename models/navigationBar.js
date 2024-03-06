function NavigationBars(sequelize, Sequelize) {
  const NavigationBar = sequelize.define('navigationBar', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    productTypeFk1: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },

    productTypeFk2: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk3: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk4: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk5: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk6: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk7: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },

    productTypeFk8: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },
    productTypeFk9: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
        key: 'id',
      },
    },

    productTypeFk10: {
      type: Sequelize.INTEGER,
      allowNull: true,
      referenes: {
        model: 'productTypes',
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

  return NavigationBar;
}

module.exports = NavigationBars;
