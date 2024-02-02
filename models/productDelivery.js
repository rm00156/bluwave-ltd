const { DataTypes } = require('sequelize');
module.exports = function(sequelize, Sequelize) {
 
    var ProductDelivery = sequelize.define('productDelivery', {
 
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

        deliveryTypeFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'deliveryTypes',
                key: 'id'
            }
        },

        price: {
            type: DataTypes.DECIMAL(10, 2),
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
 
    return ProductDelivery;
}