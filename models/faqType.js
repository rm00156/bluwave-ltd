const { DataTypes } = require('sequelize');

module.exports = function (sequelize, Sequelize) {

    var FaqType = sequelize.define('faqType', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        faqType: {
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

    return FaqType;

}