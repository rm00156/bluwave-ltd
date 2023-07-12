const { DataTypes } = require('sequelize');
module.exports = function(sequelize, Sequelize) {
 
    var AccountType = sequelize.define('accountType', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        accountType: {
            type: DataTypes.ENUM('Admin', 'Customer'),
            allowNull: false
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
 
    return AccountType;
}