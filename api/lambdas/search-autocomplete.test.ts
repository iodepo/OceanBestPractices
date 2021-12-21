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
  let awsAccessKeyIdBefore: string | undefined;
  let awsSecretAccessKey: string | undefined;
  const termsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

  beforeAll(async () => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    process.env['OPEN_SEARCH_ENDPOINT'] = esUrl;
    process.env['TERMS_INDEX_NAME'] = termsIndexName;

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

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
  });

  test('should return a bad response if there is no input query string parameter', async () => {
    const proxyEvent = {
      queryStringParameters: {},
    };

    const response = await handler(proxyEvent);
    expect(response.statusCode).toEqual(400);
    expect(response.body).toEqual('No input specified in the query string parameters');
  });

  test('should return a list of suggested words based on input', async () => {
    const proxyEvent = {
      queryStringParameters: {
        input: 'oce',
      },
    };

    const response = await handler(proxyEvent);
    const results = JSON.parse(response.body);

    expect(results).toEqual(['ocean', 'ocean wave', 'oceanic']);
  });
});
