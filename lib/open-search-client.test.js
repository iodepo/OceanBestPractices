jest.mock('@aws-sdk/signature-v4');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const nock = require('nock');

const osClient = require('./open-search-client');

SignatureV4.mockImplementation(() => ({
  sign: jest.fn().mockImplementation((request) => (request)),
}));

describe('open-search-client', () => {
  describe('openScroll', () => {
    test('should return scrolled search results', async () => {
      nock('https://open-search.example.com')
        .get('/documents/_search?scroll=60m')
        .reply(200, {
          _scroll_id: 'mockScrollId1',
          hits: {
            hits: [], // We don't actually care about faking hits.
          },
        });
      const result = await osClient.openScroll('https://open-search.example.com', 'documents', { size: 2 });

      expect(result).toEqual({
        _scroll_id: 'mockScrollId1',
        hits: {
          hits: [], // We don't actually care about faking hits.
        },
      });
    });
  });

  describe('nextScroll', () => {
    test('should return scrolled results for an existing scroll', async () => {
      nock('https://open-search.example.com')
        .get('/_search/scroll')
        .reply(200, {
          _scroll_id: 'mockScrollId1',
          hits: {
            hits: [], // We don't actually care about faking hits.
          },
        });

      const result = await osClient.nextScroll('https://open-search.example.com', 'mockScrollId1', { size: 2 });
      expect(result).toEqual({
        _scroll_id: 'mockScrollId1',
        hits: {
          hits: [], // We don't actually care about faking hits.
        },
      });
    });
  });

  describe('closeScroll', () => {
    test('should close an open scroll', async () => {
      nock('https://open-search.example.com')
        .delete('/_search/scroll/mockScrollId1')
        .reply(200, {
          succeeded: true,
          num_freed: 5,
        });

      const result = await osClient.closeScroll('https://open-search.example.com', 'mockScrollId1');
      expect(result).toEqual({
        succeeded: true,
        num_freed: 5,
      });
    });
  });

  describe('bulkDelete', () => {
    test('should use the Open Search bulk API to delete items in the index', async () => {
      const mockBulkDeleteResponse = [
        {
          delete: {
            _index: 'documents',
            _type: '_doc',
            _id: '1',
            _version: 1,
            result: 'not_found',
            _shards: {
              total: 2,
              successful: 1,
              failed: 0,
            },
            status: 404,
            _seq_no: 1,
            _primary_term: 2,
          },
        },
        {
          delete: {
            _index: 'documents',
            _type: '_doc',
            _id: '2',
            _version: 1,
            result: 'not_found',
            _shards: {
              total: 2,
              successful: 1,
              failed: 0,
            },
            status: 404,
            _seq_no: 1,
            _primary_term: 2,
          },
        },
      ];

      nock('https://open-search.example.com')
        .post('/_bulk', '"{\\"delete\\":{\\"_index\\":\\"documents\\",\\"_type\\":\\"_doc\\",\\"_id\\":\\"1\\"}}\\n{\\"delete\\":{\\"_index\\":\\"documents\\",\\"_type\\":\\"_doc\\",\\"_id\\":\\"2\\"}}\\n"')
        .reply(200, mockBulkDeleteResponse);

      const result = await osClient.bulkDelete('open-search.example.com', 'documents', ['1', '2']);
      expect(result).toEqual(mockBulkDeleteResponse);
    });
  });

  describe('percolateDocumentFields', () => {
    test('should query the terms index with the given document fields', async () => {
      const mockPercolatorResponse = {
        took: 133,
        timed_out: false,
        _shards: {
          total: 5,
          successful: 5,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 2,
          max_score: 0.287_682_1,
          hits: [
            {
              _index: 'terms',
              _type: 'doc',
              _id: 'http://purl.obolibrary.org/obo/ENVO_00000016',
              _score: 0.287_682_1,
              _source: {
                query: {
                  multi_match: {
                    query: 'sea',
                    type: 'phrase',
                    fields: [
                      'contents',
                      'title',
                    ],
                  },
                },
                source_terminology: 'Environmental Ontology',
              },
            },
            {
              _index: 'terms',
              _type: 'doc',
              _id: 'http://purl.obolibrary.org/obo/ENVO_00000015',
              _score: 0.287_682_1,
              _source: {
                query: {
                  multi_match: {
                    query: 'ocean',
                    type: 'phrase',
                    fields: [
                      'contents',
                      'title',
                    ],
                  },
                },
                source_terminology: 'Environmental Ontology',
              },
            },
          ],
        },
      };

      nock('https://open-search.example.com')
        .post('/terms/_search', {
          query: {
            percolate: {
              field: 'query',
              document: {
                title: 'Ocean Stuff',
                contents: 'This is super important stuff from the ocean and sea.',
              },
            },
          },
          from: 0,
          size: 300,
        })
        .reply(200, mockPercolatorResponse);

      const result = await osClient.percolateDocumentFields(
        'https://open-search.example.com',
        {
          title: 'Ocean Stuff',
          contents: 'This is super important stuff from the ocean and sea.',
        }
      );

      expect(result).toEqual([
        {
          label: 'sea',
          uri: 'http://purl.obolibrary.org/obo/ENVO_00000016',
          source_terminology: 'Environmental Ontology',
        },
        {
          label: 'ocean',
          uri: 'http://purl.obolibrary.org/obo/ENVO_00000015',
          source_terminology: 'Environmental Ontology',
        },
      ]);
    });
  });

  describe('putDocumentItem', () => {
    test('should add a document item to the documets index', async () => {
      const mockIndexResponse = {
        _index: 'documents',
        _type: 'doc',
        _id: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
        _version: 1,
        result: 'created',
        _shards: {
          total: 2,
          successful: 1,
          failed: 0,
        },
        _seq_no: 0,
        _primary_term: 1,
      };

      const documentItem = {
        uuid: 'abc',
        contents: 'This is some sample content.',
        name: 'This is a sample name.',
        metadata: [{
          key: 'dc.contributor.author',
          value: 'Macovei, Vlad A.',
          language: '',
          element: 'contributor',
          qualifier: 'author',
          schema: 'dc',
        }],
      };

      nock('https://open-search.example.com')
        .post('/documents/doc/abc', documentItem)
        .reply(201, mockIndexResponse);

      const result = await osClient.putDocumentItem(
        'https://open-search.example.com',
        documentItem
      );

      expect(result).toEqual(mockIndexResponse);
    });
  });
});
