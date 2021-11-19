// @ts-check
const ir = require('../lib/index-rectifier');

const handler = async () => {
  const region = process.env.AWS_REGION;

  // Perform an Index and DSpace diff.
  const result = await ir.diff(
    process.env.OPEN_SEARCH_ENDPOINT,
    process.env.DSPACE_ENDPOINT,
    { region }
  );

  // Queue updated items for re-ingest.
  await ir.commitUpdatedItems(
    result.updated,
    process.env.INGEST_TOPIC_ARN,
    { region }
  );

  // Remove deleted items from the index.
  await ir.commitRemovedItems(
    result.removed,
    process.env.OPEN_SEARCH_ENDPOINT
  );
};

module.exports = handler;
