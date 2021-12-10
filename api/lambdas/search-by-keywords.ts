/* eslint-disable camelcase */
import { z } from 'zod';
import type { APIGatewayProxyResult } from 'aws-lambda';

import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import { defaultSearchableFields } from '../lib/searchable-fields';
import { getSynonyms } from '../lib/term-synonyms';
import {
  buildDocumentSearchRequestBody,
  DocumentSearchRequestQueryOptions,
} from '../lib/document-search-builder';
import { okResponse } from '../lib/responses';

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;

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

// TODO: This was updated to remove compile errors but otherwise
// pretty much unchanged. Could use some improving and error handling
// for bad parameters.
const parseQueryParams = (
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

/**
 * Executes an Elasticsearch query with the given search options and notifies
 * the callback function when it completes. The callback function should be
 * the function that ends this Lambda function, so most likely
 * passed directly from the handler.
 *
 * @param options - An object defining the search options to use when building
 * the search query.
 */
const searchByKeyword = async (
  openSearchEndpoint: string,
  options: DocumentSearchRequestQueryOptions
): Promise<unknown> => await osClient.getDocumentsByQuery(
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
