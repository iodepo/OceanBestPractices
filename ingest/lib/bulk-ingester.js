// @ts-check
const { default: got } = require('got');
const pMap = require('p-map');

const utils = require('./ingest-queue');

/**
 * @param {string} endpoint
 * @param {number} offset
 * @returns
 */
const getItems = async (endpoint, offset) => {
  console.time('getItems()');

  const result = await got.get(`${endpoint}/rest/items`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5',
    },
    searchParams: {
      limit: 50,
      offset,
    },
    responseType: 'json',
    resolveBodyOnly: true,
  });

  console.timeEnd('getItems()');

  return result;
};

/**
 * @typedef BulkIngesterResult
 * @property {{ count: number, ids: string[] }} success
 * @property {{ count: number, ids: string[] }} error
 * @property {number} total
 */

/**
 * Fetches all available items from DSpace and queues them for ingest.
 *
 * @param {string} dspaceEndpoint The DSpace endpoint from which to fetch items.
 * @param {string} ingestTopicArn SNS Topic ARN where ingest items are queued.
 *
 * @returns {Promise<BulkIngesterResult>}
 * Result of ingest queueing. Includes the UUIDs of successful and failed item
 * queues.
 */
const bulkIngester = async (dspaceEndpoint, ingestTopicArn) => {
  /** @type BulkIngesterResult */
  const result = {
    success: {
      count: 0,
      ids: [],
    },
    error: {
      count: 0,
      ids: [],
    },
    total: 0,
  };

  let dspaceItems = await getItems(dspaceEndpoint, 0);

  let offset = dspaceItems.length;

  console.log(`INFO: Bulk ingester got ${offset} items from DSpace...`);
  while (dspaceItems.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    await pMap(
      dspaceItems,
      async (dspaceItem) => {
        try {
          result.total += 1;
          console.log(`INFO: Queuing ${dspaceItem.uuid} (${result.total}) for ingest.`);

          // Queue the DSpace item for ingest.
          await utils.queueIngestDocument(
            dspaceItem.uuid,
            ingestTopicArn
          );

          result.success.ids.push(dspaceItem.uuid);
          result.success.count += 1;
        } catch (error) {
          console.log(`ERROR: Failed to queue item with ${dspaceItem.uuid} with error: ${error}`);
          result.error.ids.push(dspaceItem.uuid);
          result.error.count += 1;
        }
      },
      { concurrency: 5 }
    );

    // eslint-disable-next-line no-await-in-loop
    dspaceItems = await getItems(dspaceEndpoint, offset);

    // DSpace doesn't guarantee that we get the specified limit back so we have
    // to increment the offset by the actual result length.
    offset += dspaceItems.length;

    console.log(`INFO: Bulk ingester got ${offset} items from DSpace...`);
  }

  console.log(`INFO: Total of items fetched from DSpace: ${offset}`);

  return result;
};

module.exports = bulkIngester;
