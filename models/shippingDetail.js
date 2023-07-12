module.exports = function (sequelize, Sequelize) {

    var ShippingDetail = sequelize.define('shippingDetail', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        accountFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'accounts',
                key: 'id'
            }
        },

        fullName: {
            type: Sequelize.STRING,
            allowNull: false
        },

        email: {
            type: Sequelize.STRING,
            allowNull: false
        },

        addressLine1: {
            type: Sequelize.STRING,
            allowNull: false
        },

        addressLine2: {
            type: Sequelize.STRING,
            allowNull: true
        },

        city: {
            type: Sequelize.STRING,
            allowNull: false
        },

        postCode: {
            type: Sequelize.STRING,
            allowNull: false
        },

        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: false
        },

        primaryFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
        },

        savedFl: {
            type: Sequelize.BOOLEAN,
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

    },
        {
            timestamps: false
        });

    return ShippingDetail;

}