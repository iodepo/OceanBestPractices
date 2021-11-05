#!/usr/bin/env node

const bulkIngester = require('../ingest/lambdas/bulk-ingester/bulk-ingester');

(async () => {
  console.log('INFO: Starting the bulk ingester...');
  const result = await bulkIngester(
    process.env.DSPACE_ENDPOINT,
    process.env.INGEST_TOPIC_ARN
  );

  console.log(`INFO: Successfully queued ${result.success.length} items.`);
  console.log(`INFO: Failed to queue ${result.error.length} items.`);
})();
