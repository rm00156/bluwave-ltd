function OptionTypeGroups(sequelize, Sequelize) {
  const OptionTypeGroup = sequelize.define('optionTypeGroup', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    productFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },

    attributeTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'attributeTypes',
        key: 'id',
      },
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

  return OptionTypeGroup;
}

module.exports = OptionTypeGroups;
