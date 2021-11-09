// @ts-check
const pMap = require('p-map');

const dspaceClient = require('../../lib/dspace-client');
const osClient = require('../../lib/open-search-client');
const utils = require('./ingest-queue');

module.exports = {
  /**
   * Commits index items that have been marked as out of date by
   * queuing them for re-ingest. Queuing will be done in parallel.
   *
   * @param {Object[]} items List of existing index items that need to
   *                         be updated.
   * @param {string} ingestTopicArn SNS Topic ARN where new documents
   *                                are queued.
   * @param {Object} [options={}] Additional options.
   * @param {string} [options.region=us-east-1] AWS region containing the
   *                                            infrastructure.
   */
  commitUpdatedItems: async (
    items,
    ingestTopicArn,
    options = {}
  ) => {
    if (items.length <= 0) return;

    const { region = 'us-east-1' } = options;

    await pMap(
      items,
      async (item) => {
        try {
          await utils.queueIngestDocument(
            // eslint-disable-next-line no-underscore-dangle
            item._id,
            ingestTopicArn,
            { region }
          );
        } catch (error) {
          console.log(`ERROR: Failed to queue updated document ${JSON.stringify(item)} with error: ${error}`);
        }
      },
      { concurrency: 5 }
    );
  },

  /**
   * Commits removed items that have been marked as removed by
   * deleting them from the index.
   *
   * @param {Object[]} items List of existing index items that need to
   *                         be deleted.
   * @param {string} openSearchEndpoint Endpoint for the OpenSearch index from
   *                                    which the items should be removed.
   * @param {Object} [options={}] Additional options.
   * @param {string} [options.region=us-east-1] AWS region containing the
   *                                            infrastructure.
   */
  commitRemovedItems: async (
    items,
    openSearchEndpoint,
    options = {}
  ) => {
    if (items.length <= 0) return;

    const { region = 'us-east-1' } = options;

    try {
      await osClient.bulkDelete(
        openSearchEndpoint,
        'documents',
        // eslint-disable-next-line no-underscore-dangle
        items.map((item) => item._id),
        { region }
      );
    } catch (error) {
      console.log(`ERROR: Failed bulk delete with error: ${error}`);
    }
  },

  /**
   * Determines whether or not the given index item should be considered out of
   * date when compared to the same dspace item.
   *
   * @param {Object} indexItem The item from the OpenSearch index.
   * @param {Object} dspaceItem The item from DSpace from which we determine if
   *                            the OpenSearch item needs to be marked as
   *                            needing update.
   *
   * @returns {boolean} True if the index item should be marked as updated when
   * compared to the same DSpace item.
   */
  isUpdated: (indexItem, dspaceItem) => {
    // eslint-disable-next-line no-underscore-dangle
    if (new Date(indexItem._source.lastModified)
        < new Date(dspaceItem.lastModified)) {
      return true;
    }

    // eslint-disable-next-line no-underscore-dangle
    const indexItemPDFBitstream = indexItem._source.bitstreams
      .find((b) => (b.bundleName === 'ORIGINAL' && b.mimeType === 'application/pdf'));
    const dspaceItemPDFBitstream = dspaceItem.bitstreams
      .find((b) => (b.bundleName === 'ORIGINAL' && b.mimeType === 'application/pdf'));

    return (indexItemPDFBitstream.checkSum.value
      !== dspaceItemPDFBitstream.checkSum.value);
  },

  /**
   *
   * @param {string} openSearchEndpoint Endpoint for the OpenSearch index from
   *                                    which the items should be removed.
   * @param {string} dspaceEndpoint Endpoint for the DSpace repository
   *                                from which the items should be ingest.
   *                                The endpoint should include the protocol.
   * @param {Object} [options={}] Additional options.
   * @param {string} [options.region=us-east-1] AWS region containing the
   *                                            infrastructure.
   *
   * @returns {Promise<Object>} Object with removed and updated items.
   */
  diff: async (
    openSearchEndpoint,
    dspaceEndpoint,
    options = {}
  ) => {
    const {
      region = 'us-east-1',
    } = options;

    const diffResult = {
      removed: [],
      updated: [],
    };

    const scrollOptions = {
      includes: ['uuid', 'bitstreams', 'lastModified'],
      region,
    };

    // eslint-disable-next-line camelcase
    let { _scroll_id, hits: { hits } } = await osClient.openScroll(openSearchEndpoint, 'documents', scrollOptions);

    while (hits.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await pMap(
        hits,
        async (indexItem) => {
          try {
            const dspaceItem = await dspaceClient.getItem(
              dspaceEndpoint,
              // eslint-disable-next-line no-underscore-dangle
              indexItem._source.uuid
            );

            // If we can't find the DSpace item for this UUID consider it
            // deleted. Also, check if the metadata has changed and if so
            // mark it updated. Otherwise consider it unchanged.
            if (dspaceItem === undefined) {
              diffResult.removed.push(indexItem);
            } else if (module.exports.isUpdated(indexItem, dspaceItem)) {
              diffResult.updated.push(indexItem);
            }
          } catch (error) {
            console.log(`ERROR: Encountered error: ${error} for diff of item: ${JSON.stringify(indexItem)}`);
          }
        },
        { concurrency: 5 }
      );

      // eslint-disable-next-line camelcase, no-await-in-loop
      ({ _scroll_id, hits: { hits } } = await osClient.nextScroll(
        openSearchEndpoint,
        _scroll_id,
        { region }
      ));
    }

    // OpenSearch documentation recommends we close the scroll when we're done.
    await osClient.closeScroll(dspaceEndpoint, _scroll_id, { region });

    return diffResult;
  },
};