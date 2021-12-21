import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';
import * as osClient from '../../lib/open-search-client';
import { handler } from './search-autocomplete';

const esUrl = 'http://localhost:9200';

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

describe('search-autocomplete.handler()', () => {
  const termsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await osClient.createTermsIndex(esUrl, termsIndexName);

    await osClient.addDocument(esUrl, termsIndexName, termsFactory('ocean'));
    await osClient.addDocument(esUrl, termsIndexName, termsFactory('ocean wave'));
    await osClient.addDocument(esUrl, termsIndexName, termsFactory('oceanic'));
    await osClient.addDocument(esUrl, termsIndexName, termsFactory('sea'));

    await osClient.refreshIndex(esUrl, termsIndexName);
  });

  afterAll(async () => {
    await osClient.deleteIndex(esUrl, termsIndexName);

    nock.enableNetConnect();
  });

  test('should return a list of suggested words', async () => {
    const proxyEvent = {
      queryStringParameters: {
        input: 'oce',
      },
    };

    const response = await handler(proxyEvent);
    const results = JSON.parse(response.body);

    expect(results).toEqual(['ocean', 'ocean wave', 'ocean wave']);
  });
});
