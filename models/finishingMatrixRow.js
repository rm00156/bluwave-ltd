module.exports = function(sequelize, Sequelize) {
 
    var FinishingMatrixRow = sequelize.define('finishingMatrixRow', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        finishingMatrixFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'finishingMatrices',
                key: 'id'
            }
        },

        optionFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'options',
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
 
    return FinishingMatrixRow;
}