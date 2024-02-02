module.exports = function (sequelize, Sequelize) {

    var Notification = sequelize.define('notification', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        accountFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            referenes: {
                model: 'accounts',
                key: 'id'
            }
        },

        createdDttm: {
            type: Sequelize.DATE,
            allowNull: false
        },

        text: {
            type: Sequelize.STRING,
            allowNull: false
        },

        link: {
            type: Sequelize.STRING,
            allowNull: false
        },

        deleteFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },

        versionNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        }

    }, {
        timestamps: false
    }
    );

    return Notification;

}