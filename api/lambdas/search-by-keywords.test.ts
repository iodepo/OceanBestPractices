/* eslint-disable no-underscore-dangle */
import { randomUUID } from 'crypto';
import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';
import * as osClient from '../../lib/open-search-client';
import { DocumentsSearchResponse } from '../../lib/open-search-schemas';
import { handler } from './search-by-keywords';

const esUrl = 'http://localhost:9200';

const documentsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

const searchHandler = (
  proxyEvent: unknown,
  expectCallback: (results: DocumentsSearchResponse) => void,
  done: (error?: unknown) => void
) => {
  // @ts-expect-error Eventually refactor this handler to be an async
  // function. Let's not worry about typing these arguments now.
  handler(proxyEvent, undefined, (_error, response) => {
    try {
      const results = JSON.parse(response.body);
      expectCallback(results);

      done();
    } catch (error) {
      done(error);
    }
  });
};

describe('search-by-keywords.handler', () => {
  let awsAccessKeyIdBefore: string | undefined;
  let awsSecretAccessKey: string | undefined;

  beforeAll(async () => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    process.env['DOCUMENTS_INDEX_NAME'] = documentsIndexName;
    process.env['OPEN_SEARCH_ENDPOINT'] = esUrl;

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await osClient.createDocumentsIndex(esUrl, documentsIndexName);
  });

  afterAll(async () => {
    await osClient.deleteIndex(esUrl, documentsIndexName);

    nock.enableNetConnect();

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
  });

  describe('when searching by keywords', () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();
    const uuid3 = randomUUID();
    const uuid4 = randomUUID();

    beforeAll(async () => {
      const doc1 = {
        uuid: uuid1,
        dc_title: 'This is a very specific ocean and sea document.',
      };

      const doc2 = {
        uuid: uuid2,
        dc_title: 'This is a document with bitstream text.',
        bitstreamText: 'This is the body. In this body we talk about ocean stuff.',
      };

      const doc3 = {
        uuid: uuid3,
        dc_title: 'This is a document with author text.',
        dc_contributor_author: 'Ocean Sea',
        dc_identifier_doi: [
          'http://dx.doi.org/10.25607/OBP-561',
        ],
      };

      const doc4 = {
        uuid: uuid4,
        dc_identifier_doi: [
          'http://dx.doi.org/10.25607/OBP-765',
        ],
      };

      await osClient.addDocument(esUrl, documentsIndexName, doc1);
      await osClient.addDocument(esUrl, documentsIndexName, doc2);
      await osClient.addDocument(esUrl, documentsIndexName, doc3);
      await osClient.addDocument(esUrl, documentsIndexName, doc4);
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid1 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid2 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid3 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid4 } });
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    test('should find documents across multiple fields', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: '::ocean',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          console.log(`Results ${JSON.stringify(results)}`);

          expect(results.hits.total.value).toEqual(3);

          const uuids = results.hits.hits.map(
            (h) => h._source.uuid
          );

          expect(uuids).toEqual([uuid1, uuid2, uuid3]);
        },
        done
      );
    });

    test('should find documents that match a single targeted field', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: ':bitstreamText:ocean',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          expect(results.hits.total.value).toEqual(1);

          const uuids = results.hits.hits.map(
            (h) => h._source.uuid
          );
          expect(uuids).toEqual([uuid2]);
        },
        done
      );
    });

    test('should find documents that match a mix of targeted fields', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: '::bitstream,+:bitstreamText:body we talk',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          expect(results.hits.total.value).toEqual(1);

          const uuids = results.hits.hits.map(
            (h) => h._source.uuid
          );
          expect(uuids).toEqual([uuid2]);
        },
        done
      );
    });

    test('should find documents with a mix of stemmed words', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: '::bodies,:dc_title:oceans',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          console.log(`Results ${JSON.stringify(results)}`);

          expect(results.hits.total.value).toEqual(2);

          const uuids = results.hits.hits.map(
            (h) => h._source.uuid
          );

          expect(uuids).toEqual([uuid1, uuid2]);
        },
        done
      );
    });

    test('should find documents with the DOI metadata field', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: ':dc_identifier_doi:10.25607/OBP-561',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          expect(results.hits.total.value).toEqual(1);

          const uuids = results.hits.hits.map(
            (h) => h._source.uuid
          );

          expect(uuids).toEqual([uuid3]);
        },
        done
      );
    });

    describe('and using boolean operators', () => {
      test('should find matching documents using the OR boolean operator', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::ocean,::specific',
          },
        };

        searchHandler(
          proxyEvent,
          (results) => {
            expect(results.hits.total.value).toEqual(3);

            const uuids = results.hits.hits.map(
              (h) => h._source.uuid
            );
            expect(uuids).toEqual([uuid1, uuid2, uuid3]);
          },
          done
        );
      });

      test('should find matching documents using the AND boolean operator', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::ocean,+::specific',
          },
        };

        searchHandler(
          proxyEvent,
          (results) => {
            expect(results.hits.total.value).toEqual(1);

            const [result] = results.hits.hits;
            expect(result?._source.uuid).toEqual(uuid1);
          },
          done
        );
      });

      test('should find matching documents using the NOT boolean operator', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::ocean,-::specific',
          },
        };

        searchHandler(
          proxyEvent,
          (results) => {
            expect(results.hits.total.value).toEqual(2);

            const uuids = results.hits.hits.map(
              (h: { _source: { uuid: string } }) => h._source.uuid
            );
            expect(uuids).toEqual([uuid2, uuid3]);
          },
          done
        );
      });

      test('should find matching documents with a mix of boolean operators', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::ocean,+::sea,-::specific',
          },
        };

        searchHandler(
          proxyEvent,
          (results) => {
            expect(results.hits.total.value).toEqual(1);

            const [result] = results.hits.hits;
            expect(result?._source.uuid).toEqual(uuid3);
          },
          done
        );
      });
    });
  });

  describe('when searching with a filter option', () => {
    describe('and filtering by endorsed', () => {
      const uuid1 = randomUUID();
      const uuid2 = randomUUID();

      beforeAll(async () => {
        // Index two documents. One should have a value for endorsed and the
        // other should not. Otherwise they're identical.
        const doc1 = {
          uuid: uuid1,
          dc_title: 'Test Document 1',
          obps_endorsementExternal_externalEndorsedBy: 'GOOS Panel',
        };

        const doc2 = {
          uuid: uuid2,
          dc_title: 'Test Document 2',
        };

        await osClient.addDocument(esUrl, documentsIndexName, doc1);
        await osClient.addDocument(esUrl, documentsIndexName, doc2);
        await osClient.refreshIndex(esUrl, documentsIndexName);
      });

      afterAll(async () => {
        await osClient.deleteByQuery(
          esUrl,
          documentsIndexName,
          { match: { uuid: uuid1 } }
        );
        await osClient.deleteByQuery(
          esUrl,
          documentsIndexName,
          { match: { uuid: uuid2 } }
        );
        await osClient.refreshIndex(esUrl, documentsIndexName);
      });

      test('should return matching documents that have a non-null value for obps.endorsementExternal.externalEndorsedBy field', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::Test',
            endorsed: 'true',
          },
        };

        // @ts-expect-error Eventually refactor this handler to be an async
        // function. Let's not worry about typing these arguments now.
        handler(proxyEvent, undefined, (_error, response) => {
          try {
            const results = JSON.parse(response.body);
            expect(results.hits.total.value).toEqual(1);

            const [result] = results.hits.hits;
            expect(result._source.uuid).toEqual(uuid1);

            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });

    describe('and filtering by refereed', () => {
      const uuid1 = randomUUID();
      const uuid2 = randomUUID();

      beforeAll(async () => {
        // Index two documents. One should have a value for refereed and the
        // other should not. Otherwise they're identical.
        const doc1 = {
          uuid: uuid1,
          dc_title: 'Test Document 1',
          dc_description_refereed: 'Refereed',
        };

        const doc2 = {
          uuid: uuid2,
          dc_title: 'Test Document 2',
        };

        await osClient.addDocument(esUrl, documentsIndexName, doc1);
        await osClient.addDocument(esUrl, documentsIndexName, doc2);
        await osClient.refreshIndex(esUrl, documentsIndexName);
      });

      afterAll(async () => {
        await osClient.deleteByQuery(
          esUrl,
          documentsIndexName,
          { match: { uuid: uuid1 } }
        );
        await osClient.deleteByQuery(
          esUrl,
          documentsIndexName,
          { match: { uuid: uuid2 } }
        );
        await osClient.refreshIndex(esUrl, documentsIndexName);
      });

      test('should return matching documents that have a non-null value for dc.description.refereed field', (done) => {
        const proxyEvent = {
          queryStringParameters: {
            keywords: '::Test',
            refereed: 'true',
          },
        };

        // @ts-expect-error Eventually refactor this handler to be an async
        // function. Let's not worry about typing these arguments now.
        handler(proxyEvent, undefined, (_error, response) => {
          try {
            const results = JSON.parse(response.body);
            expect(results.hits.total.value).toEqual(1);

            const [result] = results.hits.hits;
            expect(result._source.uuid).toEqual(uuid1);

            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });

    describe('and filtering by synonyms and like words', () => {
      test.todo('should match documents using keywords including ontological synonyms');
    });
  });

  describe('when searching with a term', () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();

    beforeAll(async () => {
      const doc1 = {
        uuid: uuid1,
        dc_title: 'This is a very specific ocean and sea document.',
        terms: [{
          label: 'alpha',
          uri: 'uri://a.l.p.h.a',
        }],
      };

      const doc2 = {
        uuid: uuid2,
        dc_title: 'This is another very specific ocean and sea document.',
        terms: [{
          label: 'bravo',
          uri: 'uri://b.r.a.v.o',
        }],
      };

      await osClient.addDocument(esUrl, documentsIndexName, doc1);
      await osClient.addDocument(esUrl, documentsIndexName, doc2);
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid1 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid2 } });
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    test('should filter matched documents by term label', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: '::ocean',
          term: 'bravo',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          expect(results.hits.total.value).toEqual(1);

          const [result] = results.hits.hits;
          expect(result?._source.uuid).toEqual(uuid2);
        },
        done
      );
    });

    test('should filter matched documents by term URI', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: '::ocean',
          termURI: 'uri://b.r.a.v.o',
        },
      };

      searchHandler(
        proxyEvent,
        (results) => {
          expect(results.hits.total.value).toEqual(1);

          const [result] = results.hits.hits;
          expect(result?._source.uuid).toEqual(uuid2);
        },
        done
      );
    });
  });

  describe('when sorting results', () => {
    test.todo('should sort results by a field and direction');
  });
});
