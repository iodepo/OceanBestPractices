/* eslint-disable camelcase */
import { z } from 'zod';
import type { APIGatewayProxyResult } from 'aws-lambda';

import pMap from 'p-map';
import got from 'got/dist/source';
import { httpsOptions } from '../../lib/got-utils';
import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import { defaultSearchableFields } from '../lib/searchable-fields';
import {
  DocumentSearchRequestBody,
  DocumentSearchRequestNestedQuery,
  DocumentSearchRequestQuery,
} from '../../lib/open-search-schemas';

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export const okResponse = (
  contentType: string,
  body: string
): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: {
    ...defaultHeaders,
    'Content-Type': contentType,
  },
  body,
});

export const internalServerErrorResponse: APIGatewayProxyResult = {
  statusCode: 500,
  headers: {
    ...defaultHeaders,
    'Content-Type': 'text/plain',
  },
  body: 'Internal Server Error',
};

const searchByKeywordQueryStringParametersSchema = z.object({
  keywords: z.string(),
  term: z.optional(z.string()),
  termURI: z.optional(z.string()),
  from: z.optional(z.string()),
  size: z.optional(z.string()),
  sort: z.optional(z.string()),
  fields: z.optional(z.string()),
  synonyms: z.optional(z.string()),
  refereed: z.optional(z.string()),
});

type SearchByKeywordsQueryStringParameters = z
  .infer<typeof searchByKeywordQueryStringParametersSchema>;

const apiGatewayProxyEventSchema = z.object({
  queryStringParameters: searchByKeywordQueryStringParametersSchema,
});

interface DocumentSearchRequestQueryOptions {
  keywords: string[]
  terms: string[]
  termURIs: string[]
  from: number,
  size: number,
  sort: string[],
  fields: string[],
  synonyms: boolean,
  refereed: boolean
}

// TODO: This was updated to remove compile errors but otherwise
// pretty much unchanged. Could use some improving and error handling
// for bad parameters.
export const parseQueryParams = (
  queryParams: SearchByKeywordsQueryStringParameters
): DocumentSearchRequestQueryOptions => ({
  keywords: queryParams.keywords.length > 0
    ? queryParams.keywords.split(',')
    : [],
  terms: queryParams.term === undefined
    ? []
    : queryParams.term.split(','),
  termURIs: queryParams.termURI === undefined
    ? []
    : queryParams.termURI.split(','),
  from: queryParams.from === undefined
    ? DEFAULT_FROM
    : Number.parseInt(queryParams.from),
  size: queryParams.size === undefined
    ? DEFAULT_SIZE
    : Number.parseInt(queryParams.size),
  sort: queryParams.sort === undefined
    ? []
    : queryParams.sort.split(','),
  fields: queryParams.fields === undefined
    ? defaultSearchableFields
    : queryParams.fields.split(','),
  synonyms: queryParams.synonyms !== undefined,
  refereed: queryParams.refereed !== undefined,
});

// TODO: This will need to be dynamic and fetched from S3.
const buildSynonymsQuery = (term: string): string => `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
               PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
               PREFIX owl: <http://www.w3.org/2002/07/owl#> \
               PREFIX skos:<http://www.w3.org/2004/02/skos/core#> \
               SELECT DISTINCT ?annotatedTarget ?annotatedPropertyLabel ?sameAsLabel \
               WHERE { \
                { \
                  ?nodeID owl:annotatedSource ?xs . \
                  ?nodeID owl:annotatedProperty ?annotatedProperty . \
                  ?nodeID owl:annotatedTarget ?annotatedTarget . \
                  ?nodeID ?aaProperty ?aaPropertyTarget . \
                  OPTIONAL {?annotatedProperty rdfs:label ?annotatedPropertyLabel} . \
                  OPTIONAL {?aaProperty rdfs:label ?aaPropertyLabel} . \
                  FILTER ( isLiteral( ?annotatedTarget ) ) . \
                  FILTER ( ?aaProperty NOT IN ( owl:annotatedSource, rdf:type, owl:annotatedProperty, owl:annotatedTarget ) ) \
                  { \
                    SELECT DISTINCT ?xs WHERE { \
                      ?xs rdfs:label ?xl . \
                      FILTER (?xl = '${term}'^^xsd:string) \
                    } \
                  }\
                } \
                UNION \
                { \
                  SELECT ?sameAsLabel \
                  WHERE { \
                    ?concept skos:prefLabel ?prefLabel . \
                    FILTER (str(?prefLabel) = '${term}') \
                    ?concept owl:sameAs ?sameAsConcept . \
                    ?sameAsConcept skos:prefLabel ?sameAsLabel . \
                  } \
                } \
              }`;

interface SynonymsResponseBody {
  results: {
    bindings: [
      {
        annotatedPropertyLabel?: {
          value: string
        },
        annotatedTarget: {
          value: string
        }
        sameAsLabel?: {
          value: string
        }
      }
    ]
  }
}

// TODO: This was relatively unchanged but can use improvement.
export const parseSynonymsResponse = (body: SynonymsResponseBody) => {
  const results = body.results.bindings;
  const synonyms = [];
  for (const r of results) {
    if (r['annotatedPropertyLabel'] !== undefined) {
      if (r['annotatedPropertyLabel']['value'] === 'has_exact_synonym'
        || r['annotatedPropertyLabel']['value'] === 'alternative_label') {
        synonyms.push(r['annotatedTarget']['value']);
      }
    } else if (r['sameAsLabel'] !== undefined) {
      synonyms.push(r['sameAsLabel']['value']);
    }
  }

  return synonyms;
};

export const getSynonyms = async (
  keywords: string[],
  sparqlUrl: string
): Promise<string[][]> => await pMap(
  keywords,
  async (k) => {
    const query = buildSynonymsQuery(k);
    const sparqlQueryResult = await got.post(
      sparqlUrl,
      {
        form: { query },
        throwHttpErrors: false,
        https: httpsOptions(sparqlUrl),
      }
    );

    return parseSynonymsResponse(JSON.parse(sparqlQueryResult.body));
  }
);

export const nestedQuery = (
  termPhrase: Record<string, string>
): DocumentSearchRequestNestedQuery => ({
  nested: {
    path: 'terms',
    query: {
      bool: {
        must: {
          match_phrase: termPhrase,
        },
      },
    },
  },
});

export const buildSort = (sortParams: string[]): unknown => {
  const sort = sortParams.map((s) => {
    const [sortKey, sortDirection] = s.split(':');

    if (sortKey === undefined) { return undefined; }

    const param: Record<string, string> = {};
    param[sortKey] = sortDirection || 'desc';

    return param;
  }).filter((x) => x);

  return [...sort, '_score'];
};

/**
 * TODO: This function was unchanged (other than ignoring typescript errors) but
 * needs to be tested and updated.
 *
 * This function takes a valid keyword string and formats it specifically
 * for our Elasticsearch query. It's responsible for parsing logical operators
 * and inserting/removing any necessary or unnecessary quotes.
 *
 * e.g. "+ocean current" becomes "AND \"ocean current\""
 * */
export const formatKeyword = (k: string): string => {
  // Map the UI operators to ES operators.
  const opTransforms = {
    '+': 'AND',
    '-': 'NOT',
  };

  // Extract the operator from the keyword.
  let op = ''; let
    fk = k;
  if (Object.keys(opTransforms).includes(fk.slice(0, 1))) {
    // @ts-expect-error TODO: Review this when we add tests for this function.
    op = opTransforms[fk.slice(0, 1)];
    // eslint-disable-next-line unicorn/prefer-string-slice
    fk = fk.substring(1, fk.length);
  }

  // Strip all double quotes from the keyword since we're
  // performing a quoted query in ES.
  fk = fk.replace(/"/g, '');

  // Optional: try splitting the search term on a space. If it's a multi-
  // word search term we'll append each term as OR'd AND searches.
  const fk_comps = fk.split(' ');
  const opt_t = fk_comps.map((t) => `"${t}"`);

  console.log(`opt_t:\n${JSON.stringify(opt_t)}`);

  // Construct the query for the primary keyword.
  fk = `${op} "${fk}"`;

  // It's a multi-word keyword. Append a grouped AND for each word in the term
  // and boost the original keyword.
  if (opt_t.length > 1) {
    fk = `${fk}^2 OR ( ${opt_t.join(' AND ')} )`;
  }

  return fk;
};

/**
 * Helper function that builds the `query` field of the Elasticsearch search
 * document.
 *
 * @param keywords - An array of search keywords.
 * @param terms An array of terms that will be used as filters in the query.
 * @param termURIs A list of term URIs (ontology URIs) that can be used as
 * filters in the query.
 * @param fields An array of field names to be searched against by the query.
 * @param refereed Whether or not `refereed` should be used as a filter.
 *
 * @returns The query object that can be used in an Elasticsearch search
 * document `query` field.
 */
export const buildDocumentSearchRequestQuery = (
  keywords: string[],
  terms: string[],
  termURIs: string[],
  fields: string[],
  refereed: boolean
): DocumentSearchRequestQuery => {
  const query: DocumentSearchRequestQuery = {
    bool: {
      must: {
        query_string: {
          fields,
          query: keywords.length > 0
            ? keywords.map((k) => formatKeyword(k)).join(' ')
            : '*',
        },
      },
    },
  };

  console.log(`Keywords:${JSON.stringify(keywords)}`);

  const filter = [];
  if (terms.length > 0 || termURIs.length > 0) {
    for (const t of terms) {
      filter.push(nestedQuery({ 'terms.label': t }));
    }

    for (const t of termURIs) {
      filter.push(nestedQuery({ 'terms.uri': t }));
    }
  }

  if (refereed) {
    filter.push({ term: { refereed: 'Refereed' } });
  }

  if (filter.length > 0) {
    query.bool.filter = filter;
  }

  console.log(JSON.stringify(query));

  return query;
};

/**
 * Builds an Elasticsearch search document object that can be used in an
 * Elasctsearch search request. Specifically, this function sets the fields to
 * include, options like from and size, and which fields should provide the
 * highlight information. It also builds the query string value based on
 * keywords provided in the `opts` argument.
 *
 * @param options Search options to include in the search document. At a
 * minimum this object should contain a from, size, keywords, terms | termsURI,
 * fields, and whether or not `refereed` should be checked.
 *
 * @returns A search document object that can be used directly by an
 * Elasticsearch search request.
 */
export const buildDocumentSearchRequestBody = (
  options: DocumentSearchRequestQueryOptions
): DocumentSearchRequestBody => ({
  _source: {
    excludes: ['contents'],
  },
  from: options.from,
  size: options.size,
  query: buildDocumentSearchRequestQuery(
    options.keywords,
    options.terms,
    options.termURIs,
    options.fields,
    options.refereed
  ),
  highlight: {
    fields: {
      _bitstreamText: {},
    },
  },
  sort: buildSort(options.sort),
});

/**
 * Executes an Elasticsearch query with the given search options and notifies
 * the callback function when it completes. The callback function should be
 * the function that ends this Lambda function, so most likely
 * passed directly from the handler.
 *
 * @param options - An object defining the search options to use when building
 * the search query.
 */
export const searchByKeyword = async (
  openSearchEndpoint: string,
  options: DocumentSearchRequestQueryOptions
): Promise<unknown> => await osClient.searchDocumentsByQuery(
  openSearchEndpoint,
  'documents',
  buildDocumentSearchRequestBody(options)
);

export const handler = async (
  event: unknown
): Promise<APIGatewayProxyResult> => {
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');
  const sparqlUrl = getStringFromEnv('SPARQL_URL');

  const apiGatewayProxyEvent = apiGatewayProxyEventSchema.safeParse(event);
  if (!apiGatewayProxyEvent.success) {
    return okResponse('application/json', JSON.stringify({}));
  }

  const openSearchQueryOptions = parseQueryParams(
    apiGatewayProxyEvent.data.queryStringParameters
  );

  if (openSearchQueryOptions.synonyms) {
    const results = await getSynonyms(
      openSearchQueryOptions.keywords,
      sparqlUrl
    );
    let keywords = [openSearchQueryOptions.keywords].flat();
    // eslint-disable-next-line unicorn/prefer-spread
    for (const r of results) { keywords = keywords.concat(r); }
    openSearchQueryOptions.keywords = keywords;
  }

  const searchResults = await searchByKeyword(
    openSearchEndpoint,
    openSearchQueryOptions
  );

  return okResponse('application/json', JSON.stringify(searchResults));
};
