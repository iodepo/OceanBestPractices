import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';
import * as osClient from '../../lib/open-search-client';

const searchAutocompleteEventSchema = z.object({
  queryStringParameters: z.object({
    input: z.string().min(1),
  }),
});

export const handler = async (event: unknown) => {
  const searchAutocompleteEvent = searchAutocompleteEventSchema.parse(event);
  const { input } = searchAutocompleteEvent.queryStringParameters;

  if (queryParams === undefined || queryParams === null) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify([]),
      headers: responseHeaders(),
    });
  } else if (queryParams.input === undefined || queryParams.input === null) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify([]),
      headers: responseHeaders(),
    });
  } else {
    const opts = {
      input: queryParams.input,
      synonyms: queryParams.synonyms || false,
    };

    getFuzzySemanticTerms(opts, (err, results) => {
      if (err !== null) {
        callback(err, {
          statusCode: 500,
          body: JSON.stringify({ err }),
          headers: responseHeaders(),
        });
      } else {
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(results),
          headers: responseHeaders(),
        });
      }
    });
  }
};
