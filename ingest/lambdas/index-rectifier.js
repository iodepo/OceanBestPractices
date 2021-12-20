const { z } = require('zod');
const ir = require('../lib/index-rectifier');

const parseEnv = () =>
  z.object({
    OPEN_SEARCH_ENDPOINT: z.string().url(),
    DSPACE_ENDPOINT: z.string().url(),
    DSPACE_ITEM_INGEST_QUEUE_URL: z.string().url(),
  }).parse(process.env);

const handler = async () => {
  const env = parseEnv();

  // Perform an Index and DSpace diff.
  const result = await ir.diff(env.OPEN_SEARCH_ENDPOINT, env.DSPACE_ENDPOINT);

  // Queue updated items for re-ingest.
  await ir.commitUpdatedItems(
    result.updated,
    env.DSPACE_ITEM_INGEST_QUEUE_URL
  );

  // Remove deleted items from the index.
  await ir.commitRemovedItems(result.removed, env.OPEN_SEARCH_ENDPOINT);
};

module.exports = { handler };
