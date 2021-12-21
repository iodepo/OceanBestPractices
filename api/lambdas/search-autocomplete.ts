import { z } from 'zod';
import * as osClient from '../../lib/open-search-client';
import { badRequestResponse, okResponse } from '../lib/responses';

interface Config {
  openSearchEndpoint: string;
  termsIndexName: string;
}

const searchAutocompleteEventSchema = z.object({
  queryStringParameters: z.object({
    input: z.string().min(1),
  }),
});

const envSchema = z.object({
  OPEN_SEARCH_ENDPOINT: z.string().url(),
  TERMS_INDEX_NAME: z.string().min(1),
});

const loadConfigFromEnv = (): Config => {
  const env = envSchema.parse(process.env);

  return {
    openSearchEndpoint: env.OPEN_SEARCH_ENDPOINT,
    termsIndexName: env.TERMS_INDEX_NAME,
  };
};

export const handler = async (event: unknown) => {
  const config = loadConfigFromEnv();

  const searchAutocompleteEvent = searchAutocompleteEventSchema.safeParse(
    event
  );

  if (!searchAutocompleteEvent.success) {
    return badRequestResponse('No input specified in the query string parameters');
  }

  const { input } = searchAutocompleteEvent.data.queryStringParameters;

  const results = await osClient.suggestTerms(
    config.openSearchEndpoint,
    config.termsIndexName,
    input
  );

  return okResponse('application/json', JSON.stringify(results));
};
