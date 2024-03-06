function OptionTypeGroupItems(sequelize, Sequelize) {
  const OptionTypeGroupItem = sequelize.define('optionTypeGroupItem', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    optionTypeGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'optionTypeGroups',
        key: 'id',
      },
    },

    optionTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'optionTypes',
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

  return OptionTypeGroupItem;
}

module.exports = OptionTypeGroupItems;
