// @ts-check
const { getStringFromEnv } = require('../../lib/env-utils');
const bulkIngester = require('../lib/bulk-ingester');

const handler = async () => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const ingestTopicArn = getStringFromEnv('INGEST_TOPIC_ARN');

  return await bulkIngester(
    dspaceEndpoint,
    ingestTopicArn
  );
};

module.exports = { handler };
