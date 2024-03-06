function OptionGroupItems(sequelize, Sequelize) {
  const OptionGroupItem = sequelize.define('optionGroupItem', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    optionGroupFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'optionGroups',
        key: 'id',
      },
    },

    optionFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'options',
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

  return OptionGroupItem;
}

module.exports = OptionGroupItems;
