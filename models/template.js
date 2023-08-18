const { DataTypes } = require('sequelize');

module.exports = function(sequelize, Sequelize) {
 
    var Template = sequelize.define('template', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        sizeOptionFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'options',
                key: 'id'
            }
        },

        bleedAreaWidth: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        bleedAreaHeight: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        trimWidth: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        trimHeight: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        safeAreaWidth: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        safeAreaHeight: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        pdfPath: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        jpegPath: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        deleteFl:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        versionNo:{
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
        
    },{
        timestamps:false
    });
 
    return Template;
}