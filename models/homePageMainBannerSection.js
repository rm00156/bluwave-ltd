function HomePageMainBannerSections(sequelize, Sequelize) {
  const HomePageMainBannerSection = sequelize.define('homePageMainBannerSection', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
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

    buttonText: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

  }, {
    timestamps: false,
  });

  return HomePageMainBannerSection;
}

module.exports = HomePageMainBannerSections;
