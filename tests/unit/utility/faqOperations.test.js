const { setUpTestDb, truncateTables } = require('../../helper/generalTestHelper');
const { createTestFaq, createTestFaqWithQuestion, createTestFaqWithQuestionAndAnswer } = require('../../helper/faqTesHelper');
const faqOperations = require('../../../utility/faq/faqOperations');

let faqTypes;
beforeAll(async () => {
  await setUpTestDb();

  faqTypes = await faqOperations.getFaqTypes();
}, 60000);

test('should return faq', async () => {
  const faqType = faqTypes[0];
  const question = 'question';
  const answer = 'answer';
  const deleteFl = true;
  const faq = await faqOperations.createFaq(question, answer, faqType.id, deleteFl);

  expect(faq.question).toBe(question);
  expect(faq.answer).toBe(answer);
  expect(faq.faqTypeFk).toBe(faqType.id);
  expect(faq.deleteFl).toBe(deleteFl);
});

describe('get faq', () => {
  it("should return null if id doesn't exist", async () => {
    const faq = await faqOperations.getFaq(0);
    expect(faq).toBeNull();
  });

  it('should return faq if id exists', async () => {
    const faq = await createTestFaq();
    const getFaq = await faqOperations.getFaq(faq.id);
    expect(getFaq).not.toBeNull();
  });
});

describe('update faq', () => {
  it('should update faq', async () => {
    const newFaqType = faqTypes[1];
    const faq = await createTestFaq();
    const newQuestion = 'newQuestion';
    const newAnswer = 'newAnswer';
    const newDeleteFl = false;
    await faqOperations.updateFaq(newQuestion, newAnswer, newDeleteFl, newFaqType.id, faq.id);

    const getFaq = await faqOperations.getFaq(faq.id);
    expect(getFaq.question).toBe(newQuestion);
    expect(getFaq.answer).toBe(newAnswer);
    expect(getFaq.deleteFl).toBe(newDeleteFl);
    expect(getFaq.faqTypeFk).toBe(newFaqType.id);
  });
});

describe('get faq by question', () => {
  it("should return null if question doesn't exist", async () => {
    const question = 'question';
    const faq = await createTestFaqWithQuestion(question);

    const getFaq = await faqOperations.getFaqByQuestion(question);
    expect(getFaq).not.toBeNull();
    expect(getFaq.id).toBe(faq.id);
  });
});

test('should return all faqs by type', async () => {
  const faq = await createTestFaq();
  const faqTypeId = faq.faqTypeFk;

  const getFaqs = await faqOperations.getFaqsByType(faqTypeId);
  expect(getFaqs.length).toBe(1);
});

test('should return faqs grouped by type', async () => {
  const faq = await createTestFaq();
  await createTestFaq();

  const faqTypeId = faq.faqTypeFk;
  const faqType = await faqOperations.getFaqTypeById(faqTypeId);
  const faqsGrouped = [];
  await faqOperations.handleFaqsGroupedByType(faqType, faqsGrouped);

  expect(faqsGrouped.length).toBe(1);
  const faqGroup = faqsGrouped[0];

  expect(faqGroup.faqs.length).toBe(2);
  expect(faqGroup.type).toBe(faqType.faqType);
  expect(faqGroup.typeId).toBe(faqType.id);
});

test('should return all faqs grouped by type', async () => {
  const faq = await createTestFaq();
  await createTestFaq();
  await createTestFaq();
  const faqsGrouped = await faqOperations.getFaqsGroupedByType();
  const faqTypeId = faq.faqTypeFk;
  const faqType = await faqOperations.getFaqTypeById(faqTypeId);
  expect(faqsGrouped.length).toBe(5);
  expect(faqsGrouped.filter((f) => f.faqs.length === 0).length).toBe(4);
  const x = faqsGrouped.filter((f) => f.faqs.length > 0);
  const faqsGroup = x[0];
  expect(faqsGroup.faqs.length).toBe(3);
  expect(faqsGroup.type).toBe(faqType.faqType);
  expect(faqsGroup.typeId).toBe(faqType.id);
});

describe('search for faq by question or answer', () => {
  it('should return faq when search contains text in question', async () => {
    const question = 'question';
    const faq = await createTestFaqWithQuestion(question);

    const searchResults = await faqOperations.searchQuestionsAnswers('que');
    expect(searchResults.length).toBe(1);

    const result = searchResults[0];
    expect(result.id).toBe(faq.id);
  });

  it('should return faq when search contains text in answer', async () => {
    const question = 'question';
    const answer = 'answer';
    const faq = await createTestFaqWithQuestionAndAnswer(question, answer);

    const searchResults = await faqOperations.searchQuestionsAnswers('answ');
    expect(searchResults.length).toBe(1);

    const result = searchResults[0];
    expect(result.id).toBe(faq.id);
  });

  it("should return no faq when search doesn't contain text in answer or question", async () => {
    const question = 'question';
    const answer = 'answer';
    await createTestFaqWithQuestionAndAnswer(question, answer);

    const searchResults = await faqOperations.searchQuestionsAnswers('test');
    expect(searchResults.length).toBe(0);
  });
});

test('get all faqs', async () => {
  await createTestFaq();
  await createTestFaq();
  await createTestFaq();

  const faqs = await faqOperations.getFaqs();
  expect(faqs.length).toBe(3);
});

afterEach(async () => {
  await truncateTables(['faqs']);
});
