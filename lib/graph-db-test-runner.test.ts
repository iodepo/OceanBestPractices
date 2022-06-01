import got from 'got';
import { ClientDigestAuth } from '@mreal/digest-auth';

const sparqlUrl = 'http://localhost:8890/sparql-auth';

// Will probably want to move this but for now it's the only place it's used.
function createDigestClient(username: string, password: string) {
  return got.extend({
    hooks: {
      afterResponse: [
        (res, retry) => {
          const { options } = res.request;
          const digestHeader = res.headers['www-authenticate'];

          if (!digestHeader) {
            return res;
          }

          const incomingDigest = ClientDigestAuth.analyze(digestHeader);

          const digest = ClientDigestAuth.generateProtectionAuth(
            incomingDigest,
            username,
            password,
            {
              method: options.method,
              uri: options.url.pathname,
              counter: 1,
            }
          );

          options.headers['authorization'] = digest.raw;

          return retry(options);
        },
      ],
      beforeRetry: [
        (options, error, retryCount) => {
          console.log(options.headers, error, retryCount);
        },
      ],
    },
  });
}

// This will probably go into a some sort of GraphDb helper. Again, this is all we have
// for now and I just want a test that proves Docker/Github Actions are working as
// expected.
type GraphsResponse = {
  results: {
    bindings: {
      g: {
        value: string
      }
    }[]
  }
}

// This is just a simple test to make sure the graph db is running correctly for tests
// (we don't have any tests that use it yet)
describe('graph-db-test-runner', () => {
  const gotDigestAuth = createDigestClient('dba', 'obptest');

  beforeAll(async () => {
    // Load ENVO
    await gotDigestAuth.post(sparqlUrl, {
      form: {
        query: 'LOAD <file:///usr/share/proj/envo.owl> INTO <https://purl.obolibrary.org/obo/envo.owl>',
      },
      responseType: 'json',
    });
  });

  afterAll(async () => {
    // Delete ENVO
    await gotDigestAuth.post(sparqlUrl, {
      form: {
        query: 'CLEAR GRAPH <https://purl.obolibrary.org/obo/envo.owl>',
      },
      responseType: 'json',
    });
  });

  test('should load ENVO', async () => {
    const { body } = await gotDigestAuth.post<GraphsResponse>(sparqlUrl, {
      form: {
        query: 'SELECT  DISTINCT ?g WHERE  { GRAPH ?g {?s ?p ?o} } ORDER BY  ?g',
      },
      responseType: 'json',
    });

    const envoGraph = body.results.bindings.find((b) => b.g.value === 'https://purl.obolibrary.org/obo/envo.owl');
    expect(envoGraph).toBeDefined();
  }, 10_000);
});
