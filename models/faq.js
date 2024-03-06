function Faqs(sequelize, Sequelize) {
  const Faq = sequelize.define('faq', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    faqTypeFk: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'faqTypes',
        key: 'id',
      },
    },

    question: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    answer: {
      type: Sequelize.TEXT,
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

  return Faq;
}

module.exports = Faqs;
