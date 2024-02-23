module.exports = function(sequelize, Sequelize) {
 
    var QuantityGroup = sequelize.define('quantityGroup', {
 
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
 
    return QuantityGroup;
}