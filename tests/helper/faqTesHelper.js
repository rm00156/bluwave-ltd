const { createFaq, getFaqTypes } = require('../../utility/faq/faqOperations');

async function createTestFaqWithQuestionAndAnswer(question, answer) {
  const faqTypes = await getFaqTypes();
  const faqType = faqTypes[0];
  const deleteFl = true;
  return createFaq(question, answer, faqType.id, deleteFl);
}

async function createTestFaqWithQuestion(question) {
  return createTestFaqWithQuestionAndAnswer(question, 'answer');
}

async function createTestFaq() {
  return createTestFaqWithQuestionAndAnswer('question', 'answer');
}

module.exports = {
  createTestFaq,
  createTestFaqWithQuestion,
  createTestFaqWithQuestionAndAnswer,
};
