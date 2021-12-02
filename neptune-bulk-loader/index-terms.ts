import _ from 'lodash';
import got from 'got';
import { z } from 'zod';
import got4aws from 'got4aws';
import { Got } from '../lib/open-search-client';
import { httpsOptions } from '../lib/got-utils';

const fetchTermsResponseSchema = z.object({
  results: z.object({
    bindings: z.array(
      z.object({
        label: z.object({
          value: z.string(),
        }),
        s: z.object({
          value: z.string(),
        }),
      })
    ),
  }),
});

interface FetchedTerm {
  label: string
  uri: string
}

interface FetchTermsParams {
  offset: number
  sparqlUrl: string
}

const fetchTerms = async (params: FetchTermsParams): Promise<FetchedTerm[]> => {
  const {
    offset,
    sparqlUrl,
  } = params;

  // TODO OBP-290 is going to make this dynamic
  const query = `
SELECT DISTINCT ?s ?label
FROM <http://purl.unep.org/sdg/sdgio.owl>
WHERE {
  ?s a owl:Class .
  ?s rdfs:label ?label .
  FILTER regex(str(?s), "SDGIO_")
}
ORDER BY ?label
LIMIT 200
OFFSET ${offset}`;

  const response = await got.post(
    sparqlUrl,
    {
      form: { query },
      responseType: 'json',
      https: httpsOptions(sparqlUrl),
      throwHttpErrors: false,
    }
  );

  if (response.statusCode !== 200) {
    throw new Error(`Neptune request failed with status ${response.statusCode}: ${response.body}`);
  }

  const parsedResponseBody = fetchTermsResponseSchema.parse(response.body);

  const { bindings } = parsedResponseBody.results;

  return bindings.map((b) => ({
    label: b.label.value,
    uri: b.s.value,
  }));
};

const indexForTerm = (term: FetchedTerm, indexName: string): unknown => ({
  index: {
    _index: indexName,
    _type: 'doc',
    _id: term.uri,
  },
});

const queryForTerm = (
  term: FetchedTerm,
  terminologyTitle: string,
  ontologyGraph: string
): unknown => ({
  query: {
    multi_match: {
      query: term.label,
      type: 'phrase',
      fields: ['contents', 'title'],
    },
  },
  source_terminology: terminologyTitle,
  ontologyGraph,
});

interface BulkIndexTermsParams {
  elasticsearchClient: Got
  terms: FetchedTerm[]
  indexName: string
  terminologyTitle: string
  ontologyGraph: string
}

const bulkIndexTerms = async (params: BulkIndexTermsParams): Promise<void> => {
  const {
    elasticsearchClient,
    terms,
    indexName,
    terminologyTitle,
    ontologyGraph,
  } = params;

  const esDoc = _(terms)
    .map((term) => [
      indexForTerm(term, indexName),
      queryForTerm(term, terminologyTitle, ontologyGraph),
    ])
    .flatten()
    .map((x) => JSON.stringify(x))
    .join('\n');

  const body = `${esDoc}\n`;

  const response = await elasticsearchClient.post(
    `${indexName}/doc/_bulk`,
    {
      headers: { 'Content-Type': 'application/json' },
      body,
      throwHttpErrors: false,
    }
  );

  if (response.statusCode !== 200) {
    throw new Error(`Neptune request failed with status ${response.statusCode}: ${response.body}`);
  }
};

interface CreateTermIndexParams {
  elasticsearchUrl: string
  ontologyNameSpace: string
  ontologyGraph: string
  indexName: string
  terminologyTitle: string
  sparqlUrl: string
}

export const indexTerms = async (
  params: CreateTermIndexParams
): Promise<void> => {
  const {
    elasticsearchUrl,
    ontologyGraph,
    terminologyTitle,
    indexName,
    sparqlUrl,
  } = params;

  const elasticsearchClient = got4aws({
    service: 'es',
  }).extend({
    prefixUrl: elasticsearchUrl,
    https: httpsOptions(elasticsearchUrl),
  });

  let offset = 0;
  let terms: FetchedTerm[];

  while (true) { // eslint-disable-line no-constant-condition
    // eslint-disable-next-line no-await-in-loop
    terms = await fetchTerms({
      offset,
      sparqlUrl,
    });

    if (terms.length === 0) break;

    await bulkIndexTerms({ // eslint-disable-line no-await-in-loop
      elasticsearchClient,
      terms,
      indexName,
      terminologyTitle,
      ontologyGraph,
    });

    console.log(`Indexed terms from ${offset} to ${offset + terms.length}`);

    offset += terms.length;
  }
};
