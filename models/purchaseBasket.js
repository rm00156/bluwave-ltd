const { DataTypes } = require('sequelize');
module.exports = function (sequelize, Sequelize) {

    var PurchaseBasket = sequelize.define('purchaseBasket', {

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
            allowNull: false,
        },

        email: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        createdDttm: {
            type: Sequelize.DATE,
            allowNull: false,
        },

        purchaseDttm: {
            type: Sequelize.DATE,
            allowNull: true
        },

        status: {
            type: Sequelize.STRING,
            allowNull: false
        },

        subTotal: {
            type: Sequelize.STRING,
            allowNull: false
        },

        total: {
            type: Sequelize.STRING,
            allowNull: false
        },

        orderNumber: {
            type: Sequelize.STRING,
            allowNull: true
        },

        orderId: {
            type: Sequelize.STRING,
            allowNull: true
        },

        shippingDetailFk: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'shippingDetails',
                key: 'id'
            }
        },

        deliveryTypeFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'deliveryTypes',
                key: 'id'
            }
        },

        deliveryPrice: {
            type: DataTypes.DECIMAL(10, 2),
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
    });

    return PurchaseBasket;

}