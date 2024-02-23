const { DataTypes } = require('sequelize');
module.exports = function(sequelize, Sequelize) {
 
    var FinishingMatrix = sequelize.define('finishingMatrix', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        productFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            }
        },

        orderNo: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM('Incomplete', 'Complete'),
            allowNull: false
        },

        optionTypeFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'optionTypes',
                key: 'id'
            }
        },

        quantityGroupFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'quantityGroups',
                key: 'id'
            }
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
 
    return FinishingMatrix;
}