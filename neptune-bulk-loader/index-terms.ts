import _ from 'lodash';
import got, { Got } from 'got';
import { z } from 'zod';
import got4aws from 'got4aws';
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
  sparqlQuery: string
}

const fetchTerms = async (params: FetchTermsParams): Promise<FetchedTerm[]> => {
  const {
    offset,
    sparqlUrl,
    sparqlQuery,
  } = params;

  const query = `
${sparqlQuery}
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
  namedGraphUri: string
): unknown => ({
  query: {
    multi_match: {
      query: term.label,
      type: 'phrase',
      fields: ['contents', 'title'],
    },
  },
  source_terminology: terminologyTitle,
  namedGraphUri,
});

interface BulkIndexTermsParams {
  elasticsearchClient: Got
  terms: FetchedTerm[]
  indexName: string
  terminologyTitle: string
  namedGraphUri: string
}

const bulkIndexTerms = async (params: BulkIndexTermsParams): Promise<void> => {
  const {
    elasticsearchClient,
    terms,
    indexName,
    terminologyTitle,
    namedGraphUri,
  } = params;

  const esDoc = _(terms)
    .map((term) => [
      indexForTerm(term, indexName),
      queryForTerm(term, terminologyTitle, namedGraphUri),
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
  namedGraphUri: string
  indexName: string
  terminologyTitle: string
  sparqlUrl: string
  sparqlQuery: string
}

export const indexTerms = async (
  params: CreateTermIndexParams
): Promise<void> => {
  const {
    elasticsearchUrl,
    namedGraphUri,
    terminologyTitle,
    indexName,
    sparqlUrl,
    sparqlQuery,
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
      sparqlQuery,
    });

    if (terms.length === 0) break;

    await bulkIndexTerms({ // eslint-disable-line no-await-in-loop
      elasticsearchClient,
      terms,
      indexName,
      terminologyTitle,
      namedGraphUri,
    });

    console.log(`Indexed terms from ${offset} to ${offset + terms.length - 1}`);

    offset += terms.length;
  }
};
