module.exports = function (sequelize, Sequelize) {

    var HomePageOption = sequelize.define('homePageOption', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        productTypeFk1: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description1: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath1: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk2: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description2: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath2: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk3: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description3: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath3: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk4: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description4: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath4: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk5: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description5: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath5: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk6: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description6: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath6: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk7: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description7: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath7: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        productTypeFk8: {
            type: Sequelize.INTEGER,
            allowNull: true,
            referenes: {
                model: 'productTypes',
                key: 'id'
            }
        },

        description8: {
            type: Sequelize.STRING,
            allowNull: true,
        },

        imagePath8: {
            type: Sequelize.STRING,
            allowNull: true,
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

    return HomePageOption;

}