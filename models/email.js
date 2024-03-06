const { DataTypes } = require('sequelize');

function Emails(sequelize, Sequelize) {
  const Email = sequelize.define('email', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    recipientEmail: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    subject: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    sentDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('Success', 'Failed'),
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

  return Email;
}

module.exports = Emails;
