import got from 'got';
import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { pick } from 'lodash';
import { URL } from 'url';
import { getStringFromEnv } from '../../lib/env-utils';
import { httpsOptions } from '../../lib/got-utils';
import {
  badGatewayResponse,
  badRequestResponse,
  internalServerErrorResponse,
  okResponse,
} from '../lib/responses';

export type PostSparqlEvent = Pick<APIGatewayProxyEventV2, 'body'>;

export const handler = async (
  event: PostSparqlEvent
): Promise<APIGatewayProxyResult> => {
  let sparqlUrl = '';
  try {
    sparqlUrl = getStringFromEnv('SPARQL_URL');
    new URL(sparqlUrl); // eslint-disable-line no-new
  } catch {
    console.log(`Invalid SPARQL_URL: "${sparqlUrl}"`);
    return internalServerErrorResponse;
  }

  const query = event.body;

  if (!query) {
    return badRequestResponse('No query specified in request body');
  }

  const response = await got.post(
    sparqlUrl,
    {
      form: { query },
      throwHttpErrors: false,
      https: httpsOptions(sparqlUrl),
    }
  );

  const contentType = response.headers['content-type'];

  if (!contentType) return badGatewayResponse;

  if (response.statusCode === 400) {
    return badRequestResponse(response.body, contentType);
  }

  if (response.statusCode !== 200) {
    const responseToLog = pick(response, ['statusCode', 'headers', 'body']);

    console.log(
      'Unexpected server response:',
      JSON.stringify(responseToLog, undefined, 2)
    );

    return internalServerErrorResponse;
  }

  return okResponse(contentType, response.body);
};
