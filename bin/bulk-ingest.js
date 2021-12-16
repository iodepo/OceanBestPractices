#!/usr/bin/env node

const bulkIngester = require('../ingest/lib/bulk-ingester');
const { getStringFromEnv } = require('../lib/env-utils');

(async () => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const ingestTopicArn = getStringFromEnv('INGEST_TOPIC_ARN');

  console.log('INFO: Starting the bulk ingester...');

  try {
    const result = await bulkIngester(
      dspaceEndpoint,
      ingestTopicArn
    );

    console.log(`INFO: Successfully queued ${result.success.count} items.`);
    console.log(`INFO: Failed to queue ${result.error.count} items.`);
  } catch (error) {
    console.log(`ERROR: Failed with error ${error}`);
  }
})();
