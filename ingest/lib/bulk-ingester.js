// @ts-check
const pMap = require('p-map');

const dspaceClient = require('../../lib/dspace-client');
const utils = require('./ingest-queue');

/**
 * Fetches all available items from DSpace and queues them for ingest.
 *
 * @param {string} dspaceEndpoint The DSpace endpoint from which to fetch items.
 * @param {string} ingestTopicArn SNS Topic ARN where ingest items are queued.
 *
 * @returns {Promise<{ success: string[], error: string[]}>} Result of ingest
 * queueing. Includes the UUIDs of successful and failed item queues.
 */
const bulkIngester = async (dspaceEndpoint, ingestTopicArn) => {
  /** @type {{ success: string[], error: string[] }} */
  const result = {
    success: [],
    error: [],
  };

  let dspaceItems = await dspaceClient.getItems(dspaceEndpoint, { limit: 100 });
  let offset = dspaceItems.length;

  console.log(`INFO: Bulk ingester got ${offset} items from DSpace...`);
  while (dspaceItems.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    await pMap(
      dspaceItems,
      async (dspaceItem) => {
        try {
          console.log(`INFO: Queuing ${dspaceItem.uuid} for ingest.`);

          // Queue the DSpace item for ingest.
          await utils.queueIngestDocument(
            dspaceItem.uuid,
            ingestTopicArn
          );

          result.success.push(dspaceItem.uuid);
        } catch (error) {
          console.log(`ERROR: Failed to queue item with ${dspaceItem.uuid} with error: ${error}`);
          result.error.push(dspaceItem.uuid);
        }
      },
      { concurrency: 5 }
    );

    // eslint-disable-next-line no-await-in-loop
    dspaceItems = await dspaceClient.getItems(
      dspaceEndpoint,
      {
        limit: 100,
        offset,
      }
    );

    // DSpace doesn't guarantee that we get the specified limit back so we have
    // to increment the offset by the actual result length.
    offset += dspaceItems.length;

    console.log(`INFO: Bulk ingester got ${offset} items from DSpace...`);
  }

  console.log(`INFO: Total of items fetched from DSpace: ${offset}`);

  return result;
};

module.exports = bulkIngester;
