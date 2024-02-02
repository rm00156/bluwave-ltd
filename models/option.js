module.exports = function(sequelize, Sequelize) {
 
    var Option = sequelize.define('option', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        optionTypeFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'optionTypes',
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
 
    return Option;
}