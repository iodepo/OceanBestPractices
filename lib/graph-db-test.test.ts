import got from 'got';

const sparqlUrl = 'http://localhost:8890/sparql';

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
describe('graph-db-test', () => {
  beforeAll(async () => {
    // Load ENVO
    const response = await got.post(sparqlUrl, {
      form: {
        query: 'LOAD <file:///usr/share/proj/envo.owl> INTO <https://purl.obolibrary.org/obo/envo.owl>',
      },
      responseType: 'json',
    });
    console.log('🚀 ~ file: graph-db-test.test.ts ~ line 29 ~ beforeAll ~ response', response);
  });

  afterAll(async () => {
    // Delete ENVO
    await got.post(sparqlUrl, {
      form: {
        query: 'CLEAR GRAPH <https://purl.obolibrary.org/obo/envo.owl>',
      },
      responseType: 'json',
    });
  });

  test('should load ENVO', async () => {
    const { body } = await got.post<GraphsResponse>(sparqlUrl, {
      form: {
        query: 'SELECT  DISTINCT ?g WHERE  { GRAPH ?g {?s ?p ?o} } ORDER BY  ?g',
      },
      responseType: 'json',
    });

    const envoGraph = body.results.bindings.find((b) => b.g.value === 'https://purl.obolibrary.org/obo/envo.owl');
    expect(envoGraph).toBeDefined();
  }, 10_000);
});
