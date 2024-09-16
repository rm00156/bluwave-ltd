const generalUtility = require('../../../utility/general/utilityHelper');

describe('utility helper', () => {
  it('should return array with original text as only entry when no commas found in text', () => {
    const text = 'hello';

    const parsed = generalUtility.parseCommaSeperatedText(text);
    expect(parsed).toEqual([text]);
  });
});
