import { parseStopwords } from './stopwords';

describe('index-terms', () => {
  describe('parseStopwords', () => {
    it('parses a stopwords list', () => {
      expect(parseStopwords('a\nb')).toEqual(['a', 'b']);
    });

    it('strips whitespace from words', () => {
      expect(parseStopwords(' a \nb')).toEqual(['a', 'b']);
    });

    it('filters out empty lines', () => {
      expect(parseStopwords('a\n\nb')).toEqual(['a', 'b']);
    });

    it('ignores trailing newline', () => {
      expect(parseStopwords('a\nb\n')).toEqual(['a', 'b']);
    });
  });
});
