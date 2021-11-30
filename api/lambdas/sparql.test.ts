import { APIGatewayProxyResult } from 'aws-lambda';
import nock from 'nock';
import { handler } from './sparql';

describe('post-sparql', () => {
  beforeAll(() => {
    nock.disableNetConnect();

    process.env['SPARQL_URL'] = 'http://sparql.local/sparql';
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it('returns an internal server error if SPARQL_URL is not set', async () => {
    const sparqlUrlBefore = process.env['SPARQL_URL'];

    try {
      delete process.env['SPARQL_URL'];

      const response = await handler({ body: 'asdf' });

      expect(response.statusCode).toBe(500);
    } finally {
      process.env['SPARQL_URL'] = sparqlUrlBefore;
    }
  });

  it('returns an internal server error if SPARQL_URL is not a valid URL', async () => {
    const sparqlUrlBefore = process.env['SPARQL_URL'];

    try {
      process.env['SPARQL_URL'] = 'invalid';

      const response = await handler({ body: 'asdf' });

      expect(response.statusCode).toBe(500);
    } finally {
      process.env['SPARQL_URL'] = sparqlUrlBefore;
    }
  });

  it('returns a bad request error if no body is set', async () => {
    const response = await handler({});

    expect(response.statusCode).toBe(400);
  });

  it('forwards the request to the graph db', async () => {
    const scope = nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(200, {});

    await handler({ body: 'blah' });

    expect(scope.isDone()).toBe(true);
  });

  it('returns an OK response on success', async () => {
    nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(200, {});

    const response = await handler({ body: 'blah' });

    expect(response.statusCode).toBe(200);
  });

  it('sets the Access-Control-Allow-Origin header in the response', async () => {
    nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(200, {});

    const response = await handler({ body: 'blah' });

    if (response.headers === undefined) fail('No headers in response');

    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('forwards the server response Content-Type to the client', async () => {
    nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(200, {}, { 'Content-Type': 'some-content-type' });

    const response = await handler({ body: 'blah' });

    if (response.headers === undefined) fail('No headers in response');

    expect(response.headers['Content-Type']).toBe('some-content-type');
  });

  it('forwards the server response body to the client', async () => {
    nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(200, 'some-body-to-love', { 'Content-Type': 'some-content-type' });

    const response = await handler({ body: 'blah' });

    expect(response.body).toBe('some-body-to-love');
  });

  it('sends the correct Content-Type header to the server', async () => {
    const scope = nock(
      'http://sparql.local',
      { reqheaders: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
      .post('/sparql')
      .reply(200, 'OK');

    await handler({ body: 'blah' });

    expect(scope.isDone()).toBe(true);
  });

  describe('when the server returns a bad response status', () => {
    let response: APIGatewayProxyResult;

    beforeEach(async () => {
      nock('http://sparql.local')
        .post('/sparql', 'query=INVALID')
        .reply(400, '"badness"', { 'Content-Type': 'application/json' });

      response = await handler({ body: 'INVALID' });
    });

    it('returns a 400 status code', () => {
      expect(response.statusCode).toBe(400);
    });

    it('returns a JSON response', () => {
      if (response.headers === undefined) fail('No headers in response');

      const contentType = response.headers['Content-Type'];

      expect(contentType).toBe('application/json');
    });

    it('returns the error message from the server', () => {
      expect(response.body).toBe('"badness"');
    });
  });

  it('returns an internal server error when an unexpected response is received from the server', async () => {
    nock('http://sparql.local')
      .post('/sparql', 'query=blah')
      .reply(418, '"I\'m a teapot"', { 'Content-Type': 'application/json' });

    const response = await handler({ body: 'blah' });

    expect(response.statusCode).toBe(500);
  });
});
