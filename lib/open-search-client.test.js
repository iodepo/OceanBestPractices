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
});
