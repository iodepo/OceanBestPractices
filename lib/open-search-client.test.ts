/* eslint-disable no-underscore-dangle */
import nock from 'nock';
import cryptoRandomString from 'crypto-random-string';
import { get } from 'lodash';
import { toMatchZodSchema } from './jest-matchers';
import * as osClient from './open-search-client';
import {
  closeScrollResponseSchema,
  openSearchScrollDocumentsResponseSchema,
  PutDocumentItemResponse,
} from './open-search-schemas';

expect.extend({ toMatchZodSchema });

const esUrl = 'http://localhost:9200';

const randomIndexName = () => `index-${cryptoRandomString({ length: 6 })}`;

const termsFactory = (label: string) => ({
  label,
  suggest: [label],
  uri: `http://example.com/tf/TF_${label}`,
  query: {
    multi_match: {
      query: label,
      type: 'phrase',
      fields: [
        'contents',
        'title',
      ],
    },
  },
  source_terminology: 'Terms Factory',
  namedGraphUri: 'http://example.com/tf/TF',
});

describe('open-search-client', () => {
  let awsAccessKeyIdBefore: string | undefined;
  let awsSecretAccessKey: string | undefined;
  let index: string;

  beforeAll(() => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    nock.disableNetConnect();

    nock.enableNetConnect('localhost');
  });

  beforeEach(async () => {
    index = randomIndexName();

    await osClient.createIndex(esUrl, index);
  });

  afterEach(async () => {
    nock.cleanAll();

    await osClient.deleteIndex(esUrl, index);
  });

  afterAll(() => {
    nock.enableNetConnect();

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
  });

  describe('openScroll', () => {
    test('should return scrolled search results', async () => {
      const response = await osClient.openScroll(esUrl, index, { size: 2 });

      expect(response)
        .toMatchZodSchema(openSearchScrollDocumentsResponseSchema);
    });
  });

  describe('nextScroll', () => {
    test('should return scrolled results for an existing scroll', async () => {
      const openScrollResponse = openSearchScrollDocumentsResponseSchema.parse(
        await osClient.openScroll(esUrl, index)
      );

      const result = await osClient.nextScroll(
        esUrl,
        openScrollResponse._scroll_id
      );

      expect(result).toMatchZodSchema(openSearchScrollDocumentsResponseSchema);
    });
  });

  describe('closeScroll', () => {
    test('should close an open scroll', async () => {
      const openScrollResponse = openSearchScrollDocumentsResponseSchema.parse(
        await osClient.openScroll(esUrl, index)
      );

      const response = await osClient.closeScroll(
        esUrl,
        openScrollResponse._scroll_id
      );

      expect(response).toMatchZodSchema(closeScrollResponseSchema);
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
    const termsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

    beforeAll(async () => {
      await osClient.createTermsIndex(esUrl, termsIndexName);

      await osClient.addDocument(esUrl, termsIndexName, {
        label: 'sea',
        suggest: ['sea'],
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
        uri: 'http://purl.obolibrary.org/obo/ENVO_00000016',
        namedGraphUri: 'http://purl.obolibrary.org/obo/ENVO',
      });

      await osClient.addDocument(esUrl, termsIndexName, {
        label: 'ocean',
        suggest: ['ocean'],
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
        uri: 'http://purl.obolibrary.org/obo/ENVO_00000017',
        namedGraphUri: 'http://purl.obolibrary.org/obo/ENVO',
      });
      await osClient.refreshIndex(esUrl, termsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteIndex(esUrl, termsIndexName);
    });

    test('should query the terms index with the given document fields', async () => {
      const result = await osClient.percolateDocumentFields(
        esUrl,
        termsIndexName,
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
          namedGraphUri: 'http://purl.obolibrary.org/obo/ENVO',
        },
        {
          label: 'ocean',
          uri: 'http://purl.obolibrary.org/obo/ENVO_00000017',
          source_terminology: 'Environmental Ontology',
          namedGraphUri: 'http://purl.obolibrary.org/obo/ENVO',
        },
      ]);
    });
  });

  describe('putDocumentItem', () => {
    test('should add a document item to the documets index', async () => {
      const mockPutDocumentItemResponse: PutDocumentItemResponse = {
        _index: 'documents',
        _type: '_doc',
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
        uuid: 'cf05c46d-e1aa-4d95-bf44-4e9c0aaa7a37',
        bitstreamText: 'This is some sample content.',
        handle: 'handle/123',
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
        dc_title: 'This is a sample name.',
      };

      nock('https://open-search.example.com')
        .post(
          '/documents/_doc/cf05c46d-e1aa-4d95-bf44-4e9c0aaa7a37',
          documentItem
        )
        .reply(201, mockPutDocumentItemResponse);

      const result = await osClient.putDocumentItem(
        'https://open-search.example.com',
        documentItem
      );

      expect(result).toEqual(mockPutDocumentItemResponse);
    });
  });

  describe('indexExists()', () => {
    it('returns true if the index exists', async () => {
      expect(await osClient.indexExists(esUrl, index)).toBe(true);
    });

    it('returns false if the index does not exist', async () => {
      expect(await osClient.indexExists(esUrl, 'does-not-exist')).toBe(false);
    });
  });

  describe('createIndex()', () => {
    it('creates the requested index', async () => {
      const indexName = randomIndexName();
      await osClient.createIndex(esUrl, indexName);

      expect(await osClient.indexExists(esUrl, indexName)).toBe(true);
    });
  });

  describe('createDocumentsIndex()', () => {
    it('creates the expected index mappings', async () => {
      const indexName = randomIndexName();
      await osClient.createDocumentsIndex(esUrl, indexName);

      const createdIndex = await osClient.getIndex(esUrl, indexName);

      const createdMappings = get(createdIndex, [indexName, 'mappings']);
      expect(createdMappings).toEqual({
        date_detection: false,
        properties: {
          bitstreamText: {
            type: 'text',
          },
          bitstreamTextKey: {
            type: 'keyword',
          },
          primaryAuthor: {
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
            type: 'text',
          },
          terms: {
            properties: {
              label: {
                type: 'text',
              },
              namedGraphUri: {
                type: 'keyword',
              },
              source_terminology: {
                type: 'keyword',
              },
              uri: {
                type: 'keyword',
              },
            },
            type: 'nested',
          },
          thumbnailRetrieveLink: {
            type: 'keyword',
          },
          bitstreams: {
            dynamic: 'true',
            type: 'nested',
          },
          dc_abstract: {
            type: 'text',
          },
          dc_date_issued: {
            format: 'yyyy',
            type: 'date',
          },
          dc_description_notes: {
            type: 'text',
          },
          dc_title: {
            fields: {
              keyword: {
                ignore_above: 256,
                type: 'keyword',
              },
            },
            type: 'text',
          },
          dc_title_alternative: {
            type: 'text',
          },
          handle: {
            type: 'keyword',
          },
          lastModified: {
            format: 'yyyy-MM-dd H:m:s.SSS',
            type: 'date',
          },
          metadata: {
            properties: {
              value: {
                type: 'keyword',
              },
            },
            type: 'nested',
          },
          uuid: {
            type: 'keyword',
          },
        },
      });
    });
  });

  describe('createTermsIndex()', () => {
    it('creates the expected index mappings', async () => {
      const indexName = randomIndexName();
      await osClient.createTermsIndex(esUrl, indexName);

      const createdIndex = await osClient.getIndex(esUrl, indexName);

      const createdMappings = get(createdIndex, [indexName, 'mappings']);

      expect(createdMappings).toEqual({
        properties: {
          suggest: {
            type: 'completion',
            analyzer: 'simple',
            max_input_length: 50,
            preserve_position_increments: true,
            preserve_separators: true,
          },
          label: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          query: {
            type: 'percolator',
          },
          source_terminology: {
            type: 'keyword',
          },
          namedGraphUri: {
            type: 'keyword',
          },
          uri: {
            type: 'keyword',
          },
          contents: {
            type: 'text',
          },
          title: {
            type: 'text',
          },
        },
      });
    });
  });

  describe('addDocument()', () => {
    it('inserts a document', async () => {
      const doc = { name: 'Lewis' };

      const addDocumentResponse = await osClient.addDocument(
        esUrl,
        index,
        doc
      );

      const getDocumentResponse = await osClient.getDocument(
        esUrl,
        index,
        // @ts-expect-error We aren't checking this type
        addDocumentResponse._id
      );

      // @ts-expect-error We aren't checking this type
      expect(getDocumentResponse._source).toEqual(doc);
    });
  });

  describe('getDocument()', () => {
    it('returns the expected document', async () => {
      const doc = { name: 'Lewis' };

      const addDocumentResponse = await osClient.addDocument(
        esUrl,
        index,
        doc
      );

      const getDocumentResponse = await osClient.getDocument(
        esUrl,
        index,
        // @ts-expect-error We aren't checking this type
        addDocumentResponse._id
      );

      // @ts-expect-error We aren't checking this type
      expect(getDocumentResponse._id).toEqual(addDocumentResponse._id);
      // @ts-expect-error We aren't checking this type
      expect(getDocumentResponse._source).toEqual(doc);
    });

    it('returns undefined if the document does not exist', async () => {
      const getDocumentResponse = await osClient.getDocument(
        esUrl,
        index,
        'does-not-exist'
      );

      expect(getDocumentResponse).toBeUndefined();
    });
  });

  describe('deleteByQuery()', () => {
    it('deletes a document that matches the query', async () => {
      // @ts-expect-error We aren't checking this type
      const { _id: maxId } = await osClient.addDocument(
        esUrl,
        index,
        { name: 'Max' }
      );

      await osClient.refreshIndex(esUrl, index);

      await osClient.deleteByQuery(esUrl, index, {
        match: {
          name: 'Max',
        },
      });

      const getMaxResult = await osClient.getDocument(
        esUrl,
        index,
        maxId
      );

      expect(getMaxResult).toBeUndefined();
    });

    it("does not delete a document that doesn't match the query", async () => {
      // @ts-expect-error We aren't checking this type
      const { _id: maxId } = await osClient.addDocument(
        esUrl,
        index,
        { name: 'Lewis' }
      );

      await osClient.refreshIndex(esUrl, index);

      await osClient.deleteByQuery(esUrl, index, {
        match: {
          name: 'Max',
        },
      });

      const getLewisResult = await osClient.getDocument(
        esUrl,
        index,
        maxId
      );

      expect(getLewisResult).not.toBeUndefined();
    });
  });

  describe('deleteIndex', () => {
    it('deletes an exisitng index', async () => {
      const indexName = randomIndexName();

      await osClient.createIndex(esUrl, indexName);

      await expect(osClient.indexExists(esUrl, indexName)).resolves.toBe(true);

      await osClient.deleteIndex(esUrl, indexName);

      await expect(osClient.indexExists(esUrl, indexName)).resolves.toBe(false);
    });
  });

  describe('getCount', () => {
    const indexName = `index-${cryptoRandomString({ length: 6 })}`;

    beforeAll(async () => {
      await osClient.addDocument(esUrl, indexName, { foo: 'bar' });
      await osClient.refreshIndex(esUrl, indexName);
    });

    afterAll(async () => {
      await osClient.deleteIndex(esUrl, indexName);
    });

    it('returns the number of documents in an index', async () => {
      const count = await osClient.getCount(esUrl, indexName);
      expect(count).toEqual(1);
    });
  });

  describe('searchByQuery', () => {
    const indexName = `index-${cryptoRandomString({ length: 6 })}`;
    beforeEach(async () => {
      await osClient.addDocument(esUrl, indexName, { foo: 'bar' });
      await osClient.refreshIndex(esUrl, indexName);
    });

    afterEach(async () => {
      await osClient.deleteIndex(esUrl, indexName);
    });

    test('should return the results of a search', async () => {
      const query = {
        bool: {
          must: {
            term: {
              foo: 'bar',
            },
          },
        },
      };

      const results = await osClient.searchByQuery(
        esUrl,
        indexName,
        { query }
      ) as {
        hits: {
          total: { value: number },
          hits: { _source: { foo: string } }[]
        }
      };

      expect(results.hits.total.value).toBe(1);

      const [result] = results.hits.hits;
      if (!result) {
        fail('Expected result but got none');
      }
      expect(result._source.foo).toBe('bar');
    });
  });

  describe('suggestTerms', () => {
    const termsIndexName = randomIndexName();

    beforeAll(async () => {
      await osClient.createTermsIndex(esUrl, termsIndexName);

      await osClient.addDocument(esUrl, termsIndexName, termsFactory('ocean'));
      await osClient.addDocument(esUrl, termsIndexName, termsFactory('ocean wave'));
      await osClient.addDocument(esUrl, termsIndexName, termsFactory('oceanic'));

      await osClient.refreshIndex(esUrl, termsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteIndex(esUrl, termsIndexName);
    });

    test('should return a list of suggested terms', async () => {
      const results = await osClient.suggestTerms(
        esUrl,
        termsIndexName,
        'oce'
      );
      expect(results).toEqual(['ocean', 'ocean wave', 'oceanic']);
    });
  });
});
