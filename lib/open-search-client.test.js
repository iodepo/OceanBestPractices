/* eslint-disable no-underscore-dangle */
// @ts-check
const cryptoRandomString = require('crypto-random-string');
const { get } = require('lodash');
const nock = require('nock');
const osClient = require('./open-search-client');

describe('open-search-client', () => {
  describe('using nock', () => {
    let awsAccessKeyIdBefore;
    let awsSecretAccessKey;

    beforeAll(() => {
      awsAccessKeyIdBefore = process.env.AWS_ACCESS_KEY_ID;
      process.env.AWS_ACCESS_KEY_ID = 'test-key-id';

      awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_SECRET_ACCESS_KEY = 'test-access-key';

      nock.disableNetConnect();
    });

    afterEach(() => {
      nock.cleanAll();
    });

    afterAll(() => {
      nock.enableNetConnect();

      process.env.AWS_ACCESS_KEY_ID = awsAccessKeyIdBefore;
      process.env.AWS_SECRET_ACCESS_KEY = awsSecretAccessKey;
    });

    describe('openScroll', () => {
      test('should return scrolled search results', async () => {
        nock('https://open-search.example.com')
          .post('/documents/_search')
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
          .post('/_search/scroll')
          .reply(200, {
            _scroll_id: 'mockScrollId1',
            hits: {
              hits: [], // We don't actually care about faking hits.
            },
          });

        const result = await osClient.nextScroll('https://open-search.example.com', 'mockScrollId1');
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

        const expectedRequestBody = `
{"delete":{"_index":"documents","_type":"_doc","_id":"1"}}
{"delete":{"_index":"documents","_type":"_doc","_id":"2"}}
`.trimStart();

        nock('https://open-search.example.com')
          .post('/_bulk', expectedRequestBody)
          .reply(200, mockBulkDeleteResponse);

        const result = await osClient.bulkDelete('https://open-search.example.com', 'documents', ['1', '2']);
        expect(result).toEqual(mockBulkDeleteResponse);
      });
    });
  });

  describe('using localstack', () => {
    const esUrl = 'http://localhost:9200';

    describe('indexExists()', () => {
      it('returns true if the index exists', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        await osClient.createIndex(esUrl, indexName);

        expect(await osClient.indexExists(esUrl, indexName)).toBe(true);
      });

      it('returns false if the index does not exist', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        expect(await osClient.indexExists(esUrl, indexName)).toBe(false);
      });
    });

    describe('createIndex()', () => {
      it('creates the requested index', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        await osClient.createIndex(esUrl, indexName);

        expect(await osClient.indexExists(esUrl, indexName)).toBe(true);
      });

      it('throws an Error if the index already exists', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        await osClient.createIndex(esUrl, indexName);

        const promisedResult = osClient.createIndex(esUrl, indexName);

        await expect(promisedResult)
          .rejects.toThrow('resource_already_exists_exception');
      });
    });

    describe('createTermsIndex()', () => {
      it('creates the expected index mappings', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        await osClient.createTermsIndex(esUrl, indexName);

        const createdIndex = await osClient.getIndex(esUrl, indexName);

        const createdMappings = get(createdIndex, [indexName, 'mappings']);

        expect(createdMappings).toEqual({
          properties: {
            contents: {
              type: 'text',
            },
            query: {
              type: 'percolator',
            },
            title: {
              type: 'text',
            },
            source_terminology: {
              type: 'keyword',
            },
            graph_uri: {
              type: 'keyword',
            },
          },
        });
      });

      it('throws an Error if the index already exists', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        await osClient.createTermsIndex(esUrl, indexName);

        const promisedResult = osClient.createIndex(esUrl, indexName);

        await expect(promisedResult)
          .rejects.toThrow('resource_already_exists_exception');
      });
    });

    describe('addDocument()', () => {
      it('inserts a document', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        const doc = { name: 'Lewis' };

        const addDocumentResponse = await osClient.addDocument(
          esUrl,
          indexName,
          doc
        );

        const getDocumentResponse = await osClient.getDocument(
          esUrl,
          indexName,
          // @ts-expect-error We aren't checking this type
          addDocumentResponse._id
        );

        // @ts-expect-error We aren't checking this type
        expect(getDocumentResponse._source).toEqual(doc);
      });
    });

    describe('getDocument()', () => {
      it('returns the expected document', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        const doc = { name: 'Lewis' };

        const addDocumentResponse = await osClient.addDocument(
          esUrl,
          indexName,
          doc
        );

        const getDocumentResponse = await osClient.getDocument(
          esUrl,
          indexName,
          // @ts-expect-error We aren't checking this type
          addDocumentResponse._id
        );

        // @ts-expect-error We aren't checking this type
        expect(getDocumentResponse._id).toEqual(addDocumentResponse._id);
        // @ts-expect-error We aren't checking this type
        expect(getDocumentResponse._source).toEqual(doc);
      });

      it('returns undefined if the document does not exist', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        const getDocumentResponse = await osClient.getDocument(
          esUrl,
          indexName,
          'does-not-exist'
        );

        expect(getDocumentResponse).toBeUndefined();
      });
    });

    describe('deleteByQuery()', () => {
      it('deletes a document that matches the query', async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        // @ts-expect-error We aren't checking this type
        const { _id: maxId } = await osClient.addDocument(
          esUrl,
          indexName,
          { name: 'Max' }
        );

        await osClient.refreshIndex(esUrl, indexName);

        await osClient.deleteByQuery(esUrl, indexName, {
          match: {
            name: 'Max',
          },
        });

        const getMaxResult = await osClient.getDocument(
          esUrl,
          indexName,
          maxId
        );

        expect(getMaxResult).toBeUndefined();
      });

      it("does not delete a document that doesn't match the query", async () => {
        const indexName = `index-${cryptoRandomString({ length: 6 })}`;

        // @ts-expect-error We aren't checking this type
        const { _id: maxId } = await osClient.addDocument(
          esUrl,
          indexName,
          { name: 'Lewis' }
        );

        await osClient.refreshIndex(esUrl, indexName);

        await osClient.deleteByQuery(esUrl, indexName, {
          match: {
            name: 'Max',
          },
        });

        const getLewisResult = await osClient.getDocument(
          esUrl,
          indexName,
          maxId
        );

        expect(getLewisResult).not.toBeUndefined();
      });
    });
  });
});
