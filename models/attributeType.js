const { DataTypes } = require('sequelize');
module.exports = function(sequelize, Sequelize) {
 
    var AttributeType = sequelize.define('attributeType', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        attributeType: {
            type: DataTypes.ENUM('Printing', 'Finishing'),
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
 
    return AttributeType;
}