const models = require('../../models');

async function getFaqs() {
    return await models.sequelize.query('select f.*, ft.faqType from faqs f' + 
            ' inner join faqTypes ft on f.faqTypeFk = ft.id ',
            {type: models.sequelize.QueryTypes.SELECT});
}

async function getFaqByQuestion(question) {
    return await models.faq.findOne({
        where: {
            question: question
        }
    })
}

async function createFaq(question, answer, faqTypeId, deleteFl) {
    return await models.faq.create({
        question: question,
        answer: answer,
        faqTypeFk: faqTypeId,
        deleteFl: deleteFl,
        versionNo : 1
    })
}

async function getFaq(id) {

    return await models.faq.findOne({
        where: {
            id: id
        }
    })
}

async function updateFaq(question, answer, deleteFl, faqTypeId, id) {
    await models.faq.update({
        answer: answer,
        question: question,
        faqTypeFk: faqTypeId,
        deleteFl: deleteFl,
        versionNo: models.sequelize.literal('versionNo + 1')
    }, {
        where: {
            id: id
        }
    })
}

async function getFaqTypes() {
    return await models.faqType.findAll();
}

async function getFaqsGroupedByType() {

    const faqTypes = await models.faqType.findAll();
    const faqsGroupedByType = [];

    for(var i = 0; i < faqTypes.length; i++) {
        const faqType = faqTypes[i];
        const faqs = await models.faq.findAll({
            where: {
                faqTypeFk: faqType.id
            }
        });

        const item = {
            faqs: faqs,
            type: faqType.faqType,
            typeId: faqType.id
        };

        faqsGroupedByType.push(item);
    }

    return faqsGroupedByType;
}

async function searchQuestionsAnswers(search) {
    return await models.sequelize.query("select * from faqs " +
    " where ( question like :search " +
    " or answer like :search )",
    { replacements: { search: '%' + search + '%' }, type: models.sequelize.QueryTypes.SELECT });
}

module.exports = {
    getFaqs,
    getFaqByQuestion,
    createFaq,
    getFaq,
    updateFaq,
    getFaqTypes,
    getFaqsGroupedByType,
    searchQuestionsAnswers
}