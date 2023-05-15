import { z } from 'zod';
import * as osClient from '../../lib/open-search-client';

const lambdaInvokeSchema = z.object({
  uuid: z.string().uuid(),
});

const parseEnv = () =>
  z.object({
    OPEN_SEARCH_ENDPOINT: z.string().url(),
  }).parse(process.env);

/**
 * Deletes a document from the documents OpenSearch index for a given UUID.
 * @param event UUID to delete from the documents index.
 * @returns { deleted: number } Deletion results including number of deleted items.
 */
export const handler = async (event: { uuid: string }) => {
  const env = parseEnv();

  const lambdaInvokeEvent = lambdaInvokeSchema.parse(event);
  const { uuid } = lambdaInvokeEvent;

  const result = await osClient.deleteByQuery(
    env.OPEN_SEARCH_ENDPOINT,
    'documents',
    { match: { uuid } }
  );

  return result;
};
