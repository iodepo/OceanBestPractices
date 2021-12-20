/* eslint-disable no-underscore-dangle */
import { randomUUID } from 'crypto';
import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';
import * as osClient from '../../lib/open-search-client';
import { handler } from './search-by-keywords';

const esUrl = 'http://localhost:9200';

const documentsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

describe('search-by-keywords.handler', () => {
  beforeAll(async () => {
    process.env['DOCUMENTS_INDEX_NAME'] = documentsIndexName;
    process.env['OPEN_SEARCH_ENDPOINT'] = esUrl;

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await osClient.createDocumentsIndex(esUrl, documentsIndexName);
  });

  afterAll(async () => {
    await osClient.deleteIndex(esUrl, documentsIndexName);

    nock.enableNetConnect();
  });

  describe('when filtering by endorsed', () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();

    beforeEach(async () => {
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

    test('should return matching documents that have a non-null value for obps.endorsementExternal.externalEndorsedBy field', (done) => {
      const proxyEvent = {
        queryStringParameters: {
          keywords: 'Test',
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
});
