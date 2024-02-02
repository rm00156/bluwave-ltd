module.exports = function (sequelize, Sequelize) {

    var HomePageBannerSection = sequelize.define('homePageBannerSection', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        productTypeFk: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'productTypes',
                key: 'id'
            }
        },

        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },

        description: {
            type: Sequelize.TEXT,
            allowNull: false,
        },

        imagePath: {
            type: Sequelize.STRING,
            allowNull: false,
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

    return HomePageBannerSection;

}