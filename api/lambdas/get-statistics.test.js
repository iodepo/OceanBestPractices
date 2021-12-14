const nock = require('nock');
const { handler } = require('./get-statistics');
const osClient = require('../../lib/open-search-client');

const openSearchEndpoint = 'http://localhost:9200';

describe('get-statistics.handler', () => {
  /** @type {string | undefined} */
  let awsAccessKeyIdBefore;

  /** @type {string | undefined} */
  let awsSecretAccessKey;

  beforeAll(async () => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    process.env['OPEN_SEARCH_ENDPOINT'] = openSearchEndpoint;

    nock.disableNetConnect();

    nock.enableNetConnect('localhost');

    await osClient.createDocumentsIndex(openSearchEndpoint, 'documents');
    await osClient.createTermsIndex(openSearchEndpoint, 'terms');

    await osClient.addDocument(openSearchEndpoint, 'documents', { foo: 'bar' });
    await osClient.addDocument(openSearchEndpoint, 'terms', { foo: 'bar' });

    await osClient.refreshIndex(openSearchEndpoint, 'documents');
    await osClient.refreshIndex(openSearchEndpoint, 'terms');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await osClient.deleteIndex(openSearchEndpoint, 'documents');
    await osClient.deleteIndex(openSearchEndpoint, 'terms');

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

  test.todo('should return the count of graphs in Neptune');
});
