/* eslint-disable no-underscore-dangle */
import { buildSearchDocument } from './search-document-builder';

describe('search-document', () => {
  describe('buildSearchDocument', () => {
    describe('_source', () => {
      test('excludes fields from the search results', () => {
        const result = buildSearchDocument({});

        const expectedSourceExcludes = ['_bitstreamText', 'bitstreams', 'metadata'];
        expect(result._source.excludes).toEqual(expectedSourceExcludes);
      });
    });
  });
});
