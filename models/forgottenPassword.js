const { DataTypes } = require('sequelize');

module.exports = function (sequelize, Sequelize) {

    var ForgottenPassword = sequelize.define('forgottenPassword', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        accountFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },

        createdDttm: {
            type: Sequelize.DATE,
            allowNull: false
        },

        expirationDttm: {
            type: Sequelize.DATE,
            allowNull: false,
        },

        usedFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },

        token: {
            type: Sequelize.STRING,
            allowNull: false
        },

        deleteFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },

        versionNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    }, {
        timestamps: false
    }
    );

    return ForgottenPassword;

}