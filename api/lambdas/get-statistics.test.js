const nock = require('nock');
const cryptoRandomString = require('crypto-random-string');
const { handler } = require('./get-statistics');
const osClient = require('../../lib/open-search-client');

const openSearchEndpoint = 'http://localhost:9200';
const sparqlUrl = 'http://neptune.com/sparql';

describe('get-statistics.handler', () => {
  /** @type {string | undefined} */
  let awsAccessKeyIdBefore;

  /** @type {string | undefined} */
  let awsSecretAccessKey;

  const documentsIndexName = `index-${cryptoRandomString({ length: 6 })}`;
  const termsIndexName = `index-${cryptoRandomString({ length: 6 })}`;

  beforeAll(async () => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    process.env['DOCUMENTS_INDEX_NAME'] = documentsIndexName;
    process.env['TERMS_INDEX_NAME'] = termsIndexName;
    process.env['OPEN_SEARCH_ENDPOINT'] = openSearchEndpoint;
    process.env['SPARQL_URL'] = sparqlUrl;

    nock.disableNetConnect();

    nock.enableNetConnect('localhost');

    await osClient.createDocumentsIndex(openSearchEndpoint, documentsIndexName);
    await osClient.createTermsIndex(openSearchEndpoint, termsIndexName);

    await osClient.addDocument(openSearchEndpoint, documentsIndexName, { foo: 'bar' });
    await osClient.addDocument(openSearchEndpoint, termsIndexName, { foo: 'bar' });

    await osClient.refreshIndex(openSearchEndpoint, documentsIndexName);
    await osClient.refreshIndex(openSearchEndpoint, termsIndexName);
  });

  beforeEach(() => {
    nock('http://neptune.com')
      .post('/sparql')
      .reply(200, {
        head: {
          vars: ['g'],
        },
        results: {
          bindings: [{
            g: {
              type: 'uri',
              value: 'http://purl.unep.org/sdg/sdgio.owl',
            },
          }, {
            g: {
              type: 'uri',
              value: 'http://vocab.nerc.ac.uk/collection/L05/current/',
            },
          }],
        },
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await osClient.deleteIndex(openSearchEndpoint, documentsIndexName);
    await osClient.deleteIndex(openSearchEndpoint, termsIndexName);

    nock.enableNetConnect();

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
  });

  test('should return a successful response', async () => {
    const response = await handler();
    expect(response.statusCode).toEqual(200);
  });

  test('should return the count of documents in the index', async () => {
    const result = await handler();
    const body = JSON.parse(result.body);
    expect(body.documents.count).toEqual(1);
  });

  test('should return the count of terms in the index', async () => {
    const result = await handler();
    const body = JSON.parse(result.body);
    expect(body.ontologies.terms.count).toEqual(1);
  });

  test('should return the count of graphs in Neptune', async () => {
    const result = await handler();
    const body = JSON.parse(result.body);
    expect(body.ontologies.count).toEqual(2);
  });
});
