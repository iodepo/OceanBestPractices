/* eslint-disable no-underscore-dangle */
import nock from 'nock';
import cryptoRandomString from 'crypto-random-string';
import { get } from 'lodash';

import * as osClient from './open-search-client';
import { PutDocumentItemResponse } from './schemas';

describe('open-search-client', () => {
  let awsAccessKeyIdBefore: string | undefined;
  let awsSecretAccessKey: string | undefined;

  beforeAll(() => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    nock.disableNetConnect();

    nock.enableNetConnect((host) => {
      const [hostname, port] = host.split(':');

      if (port === undefined) throw new Error('Expected a local stack or ES port.');

      return hostname === 'localhost'
        && ['4566', '9200'].includes(port);
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
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
      const result = await osClient.openScroll(
        'https://open-search.example.com',
        'documents',
        { size: 2 }
      );

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

      const result = await osClient.nextScroll(
        'https://open-search.example.com',
        'mockScrollId1'
      );
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

      const result = await osClient.closeScroll(
        'https://open-search.example.com',
        'mockScrollId1'
      );
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

      const result = await osClient.bulkDelete(
        'https://open-search.example.com',
        'documents',
        ['1', '2']
      );
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
                graphUri: {
                  type: 'keyword',
                },
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
      const mockPutDocumentItemResponse: PutDocumentItemResponse = {
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
        lastModified: '2021-11-01 15:10:17.231',
        bitstreams: [],
      };

      nock('https://open-search.example.com')
        .post('/documents/doc/abc', documentItem)
        .reply(201, mockPutDocumentItemResponse);

      const result = await osClient.putDocumentItem(
        'https://open-search.example.com',
        documentItem
      );

      expect(result).toEqual(mockPutDocumentItemResponse);
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
