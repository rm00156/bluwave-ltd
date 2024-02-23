module.exports = function(sequelize, Sequelize) {
 
    var PriceMatrixRow = sequelize.define('priceMatrixRow', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        priceMatrixFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'priceMatrices',
                key: 'id'
            }
        },

        optionGroupFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'optionGroups',
                key: 'id'
            }
        },

        orderNo: {
            type: Sequelize.INTEGER,
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
 
    return PriceMatrixRow;
}