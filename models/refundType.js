module.exports = function(sequelize, Sequelize) {
 
    var RefundType = sequelize.define('refundType', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        type: {
            type: Sequelize.STRING,
            allowNull:false
        },

        deleteFl:{
            type:Sequelize.BOOLEAN,
            allowNull:false
        },

        versionNo:{
            type:Sequelize.INTEGER,
            allowNull:false
        }
 
    },{
        timestamps:false
    }
);
 
    return RefundType;
 
}