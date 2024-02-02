module.exports = function(sequelize, Sequelize) {
 
    var QuantityGroupItems = sequelize.define('quantityGroupItem', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        quantityGroupFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'quantityGroups',
                key: 'id'
            }
        },

        quantityFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'quantities',
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
 
    return QuantityGroupItems;
}