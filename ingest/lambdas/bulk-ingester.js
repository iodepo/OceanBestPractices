// @ts-check
const bulkIngester = require('../lib/bulk-ingester');

const handler = async () => {
  const dspaceEndpoint = process.env.DSPACE_ENDPOINT;
  const ingestTopicArn = process.env.INGEST_TOPIC_ARN;
  if (dspaceEndpoint === undefined || ingestTopicArn === undefined) {
    console.log('WARN: Bulk ingester called without required environment variables.');
    return;
  }

  bulkIngester(
    dspaceEndpoint,
    ingestTopicArn
  );
};

module.exports = handler;
