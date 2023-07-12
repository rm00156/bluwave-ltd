const { DataTypes } = require('sequelize');

module.exports = function (sequelize, Sequelize) {

    var DeliveryType = sequelize.define('deliveryType', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        name: {
            type: Sequelize.STRING,
            allowNull: false
        },

        workingDays: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        collectFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
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

    return DeliveryType;

}