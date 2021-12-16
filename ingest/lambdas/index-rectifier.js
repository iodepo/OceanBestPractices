const { z } = require('zod');
const ir = require('../lib/index-rectifier');

const parseEnv = () =>
  z.object({
    AWS_REGION: z.string(),
    OPEN_SEARCH_ENDPOINT: z.string().url(),
    DSPACE_ENDPOINT: z.string().url(),
    INGEST_TOPIC_ARN: z.string(),
  }).parse(process.env);

const handler = async () => {
  const env = parseEnv();

  // Perform an Index and DSpace diff.
  const result = await ir.diff(env.OPEN_SEARCH_ENDPOINT, env.DSPACE_ENDPOINT);

  // Queue updated items for re-ingest.
  await ir.commitUpdatedItems(
    result.updated,
    env.INGEST_TOPIC_ARN,
    env.AWS_REGION
  );

  // Remove deleted items from the index.
  await ir.commitRemovedItems(result.removed, env.OPEN_SEARCH_ENDPOINT);
};

module.exports = { handler };
