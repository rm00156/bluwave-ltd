const models = require('../../models');

async function getFaqs() {
  return models.sequelize.query('select f.*, ft.faqType from faqs f inner join faqTypes ft on f.faqTypeFk = ft.id ', {
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function getFaqByQuestion(question) {
  return models.faq.findOne({
    where: {
      question,
    },
  });
}

async function createFaq(question, answer, faqTypeId, deleteFl) {
  return models.faq.create({
    question,
    answer,
    faqTypeFk: faqTypeId,
    deleteFl,
    versionNo: 1,
  });
}

async function getFaq(id) {
  return models.faq.findOne({
    where: {
      id,
    },
  });
}

async function updateFaq(question, answer, deleteFl, faqTypeFk, id) {
  await models.faq.update(
    {
      answer,
      question,
      faqTypeFk,
      deleteFl,
      versionNo: models.sequelize.literal('versionNo + 1'),
    },
    {
      where: {
        id,
      },
    },
  );
}

async function getFaqTypes() {
  return models.faqType.findAll();
}

async function getFaqTypeById(id) {
  return models.faqType.findOne({
    where: {
      id,
    },
  });
}

async function getFaqsByType(faqTypeFk) {
  return models.faq.findAll({
    where: {
      faqTypeFk,
    },
  });
}

async function handleFaqsGroupedByType(faqType, faqsGroupedByType) {
  const faqs = await getFaqsByType(faqType.id);

  const item = {
    faqs,
    type: faqType.faqType,
    typeId: faqType.id,
  };

  faqsGroupedByType.push(item);
}

async function getFaqsGroupedByType() {
  const faqTypes = await models.faqType.findAll();
  const faqsGroupedByType = [];

  await Promise.all(faqTypes.map(async (faqType) => handleFaqsGroupedByType(faqType, faqsGroupedByType)));

  return faqsGroupedByType;
}

async function searchQuestionsAnswers(search) {
  return models.sequelize.query('select * from faqs where ( question like :search or answer like :search )', {
    replacements: { search: `%${search}%` },
    type: models.sequelize.QueryTypes.SELECT,
  });
}

module.exports = {
  getFaqsByType,
  getFaqTypeById,
  getFaqs,
  getFaqByQuestion,
  createFaq,
  getFaq,
  updateFaq,
  getFaqTypes,
  getFaqsGroupedByType,
  searchQuestionsAnswers,
  handleFaqsGroupedByType,
};
