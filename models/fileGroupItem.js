module.exports = function(sequelize, Sequelize) {
 
    var FileGroupItem = sequelize.define('fileGroupItem', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        fileGroupFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'fileGroups',
                key: 'id'
            }
        },

        path: {
            type: Sequelize.STRING,
            allowNull: false, 
        },

        fileName: {
            type: Sequelize.STRING,
            alllowNull: false
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
 
    return FileGroupItem;
}