#!/usr/bin/env node

const bulkIngester = require('../ingest/lib/bulk-ingester');

(async () => {
  console.log('INFO: Starting the bulk ingester...');

  try {
    const result = await bulkIngester(
      process.env.DSPACE_ENDPOINT,
      process.env.INGEST_TOPIC_ARN
    );

    console.log(`INFO: Successfully queued ${result.success.length} items.`);
    console.log(`INFO: Failed to queue ${result.error.length} items.`);
  } catch (error) {
    console.log(`ERROR: Failed with error ${error}`);
  }
})();
