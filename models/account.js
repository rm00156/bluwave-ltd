module.exports = function(sequelize, Sequelize) {
 
    var Account = sequelize.define('account', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        email: {
            type: Sequelize.STRING,
            validate: {
                isEmail: true
            },
            allowNull:false,
            unique: true
        },

        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: false
        },

        password:{
            type: Sequelize.STRING,
            allowNull: false
        },

        name:{
            type: Sequelize.STRING,
            allowNull: true
        },

        accountTypeFk: {
            type:Sequelize.INTEGER,
            references: {
                model: 'accountTypes',
                key: 'id'
            }
        },
        
        createdAt: {
            field:'created_at',
            type: Sequelize.DATE,
            default: Date.now()
        },
        
        accountNumber:{
            type: Sequelize.STRING,
            allowNull: false
        },

        secret:{
            type:Sequelize.STRING,
            allowNull:true
        },

        guestFl:{
            type: Sequelize.BOOLEAN,
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
    }
);
 
    return Account;
}