import { parseSearchKeyword } from './search-keyword-comps';

describe('parseSearchKeyword', () => {
  test('should parse a blank operator, field, and term into components', () => {
    const keyword = ':title:the most important part';
    const result = parseSearchKeyword(keyword);

    expect(result).toEqual({
      operator: '',
      field: 'title',
      term: 'the most important part',
    });
  });

  test('should transform a - operator, field, and term into a query string', () => {
    const keyword = '-:title:the most important part';
    const result = parseSearchKeyword(keyword);

    expect(result).toEqual({
      operator: '-',
      field: 'title',
      term: 'the most important part',
    });
  });

  test('should transform an + operator, field, and term into a query string', () => {
    const keyword = '+:title:the most important part';
    const result = parseSearchKeyword(keyword);

    expect(result).toEqual({
      operator: '+',
      field: 'title',
      term: 'the most important part',
    });
  });

  test('should transform a search keyword with a missing field into a query string matching all fields', () => {
    const keyword = '::the most important part';
    const result = parseSearchKeyword(keyword);

    expect(result).toEqual({
      operator: '',
      field: '*',
      term: 'the most important part',
    });
  });

  test('should transform a search keyword with a missing term into a query string matching all text', () => {
    const keyword = ':title:';
    const result = parseSearchKeyword(keyword);

    expect(result).toEqual({
      operator: '',
      field: 'title',
      term: '*',
    });
  });

  test('should throw an error if a search keyword does not have an operator, field, and term', () => {
    const keyword = ':foo';

    expect(() => {
      parseSearchKeyword(keyword);
    }).toThrowError(new Error('Invalid search keyword ":foo". Keywords must include an operator, field, and term components.'));
  });
});
