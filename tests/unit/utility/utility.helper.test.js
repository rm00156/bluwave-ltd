const generalUtility = require('../../../utility/general/utilityHelper');

describe('utility helper', () => {
  it('should return array with original text as only entry when no commas found in text', () => {
    const text = 'hello';

    const parsed = generalUtility.parseCommaSeperatedText(text);
    expect(parsed).toEqual([text]);
  });

  it('should return correct date after adding business days', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ 'england-and-wales': { events: [{ date: '2024-12-25' }, { date: '2024-12-26' }, { date: '2025-01-01' }] } }),
    }));
    const businessDate = await generalUtility.getBusinessDay(new Date('2024-12-23'), 6);
    expect(businessDate).toBe('3rd Jan');
  });
});

afterAll(() => {
  jest.resetAllMocks();
});
