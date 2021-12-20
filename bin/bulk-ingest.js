#!/usr/bin/env node

const bulkIngester = require('../ingest/lib/bulk-ingester');
const { getStringFromEnv } = require('../lib/env-utils');

(async () => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const itemIngestQueueUrl = getStringFromEnv('DSPACE_ITEM_INGEST_QUEUE_URL');

  console.log('INFO: Starting the bulk ingester...');

  try {
    const result = await bulkIngester(
      dspaceEndpoint,
      itemIngestQueueUrl
    );

    console.log(`INFO: Successfully queued ${result.success.count} items.`);
    console.log(`INFO: Failed to queue ${result.error.count} items.`);
  } catch (error) {
    console.log(`ERROR: Failed with error ${error}`);
  }
})();
