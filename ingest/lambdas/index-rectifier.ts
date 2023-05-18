import { z } from 'zod';
import * as ir from '../lib/index-rectifier';
import { awsLambdaClient } from '../../lib/lambda-client';

const parseEnv = () =>
  z.object({
    AWS_REGION: z.string(),
    OPEN_SEARCH_ENDPOINT: z.string().url(),
    DSPACE_PROXY_FUNCTION: z.string().min(1),
    INGEST_TOPIC_ARN: z.string(),
  }).parse(process.env);

export const handler = async () => {
  const env = parseEnv();

  console.log('DEBUG: Diff\'ing index with DSpace');

  // Perform an Index and DSpace diff.
  const result = await ir.diff(
    env.OPEN_SEARCH_ENDPOINT,
    env.DSPACE_PROXY_FUNCTION,
    awsLambdaClient()
  );

  console.log(`DEBUG: Index rectifier diff result: ${JSON.stringify(result)}`);
  // Queue updated items for re-ingest.
  await ir.commitUpdatedItems(
    result.updated,
    env.INGEST_TOPIC_ARN
  );

  console.log('DEBUG: Committed diff result');
  return result;
};
