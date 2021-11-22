/* eslint-disable no-underscore-dangle */
// @ts-check
const pMap = require('p-map');

const dspaceClient = require('../../lib/dspace-client');
const osClient = require('../../lib/open-search-client');
const utils = require('./ingest-queue');

/**
 * @typedef {import('../../lib/dspace-types').DSpaceItem} DSpaceItem
 * @typedef {import('../../lib/open-search-types').SearchItem} SearchItem
 */

/**
 * @typedef {import('../../lib/open-search-types').DocumentItem} DocumentItem
 *
 * @typedef {Object} IsUpdatedIndexItem
 * @property {Pick<DocumentItem, 'lastModified' | 'bitstreams'>} _source
 *
 * @typedef {Pick<DSpaceItem, 'lastModified' | 'bitstreams'>} IsUpdatedDSpaceItem
 */

module.exports = {
  /**
   * Commits index items that have been marked as out of date by
   * queuing them for re-ingest. Queuing will be done in parallel.
   *
   * @param {{_id: string}[]} items List of existing index items that need to
   *                         be updated.
   * @param {string} ingestTopicArn SNS Topic ARN where new documents
   *                                are queued.
   * @param {Object} [options={}] Additional options.
   * @param {string} [options.region='us-east-1'] AWS region containing the
   *                                            infrastructure.
   * @returns {Promise<void>}
   */
  commitUpdatedItems: async (
    ids,
    ingestTopicArn,
    options = {}
  ) => {
    if (ids.length === 0) return;

    const { region = 'us-east-1' } = options;

    await pMap(
      ids,
      async (id) => {
        try {
          await utils.queueIngestDocument(
            id,
            ingestTopicArn,
            { region }
          );
        } catch (error) {
          console.log(`ERROR: Failed to queue updated document ${JSON.stringify(id)} with error: ${error}`);
        }
      },
      { concurrency: 5 }
    );
  },

  /**
   * Commits removed items that have been marked as removed by
   * deleting them from the index.
   *
   * @param {string[]} ids List of existing index items IDs that need to
   *                         be deleted.
   * @param {string} openSearchEndpoint Endpoint for the OpenSearch index from
   *                                    which the items should be removed.
   * @param {Object} [options={}] Additional options.
   *
   * @returns {Promise<void>}
   */
  commitRemovedItems: async (
    ids,
    openSearchEndpoint
  ) => {
    if (ids.length === 0) return;

    try {
      await osClient.bulkDelete(
        openSearchEndpoint,
        'documents',
        ids
      );
    } catch (error) {
      console.log(`ERROR: Failed bulk delete with error: ${error}`);
    }
  },

  /**
   * Determines whether or not the given index item should be considered out of
   * date when compared to the same dspace item.
   *
   * @param {IsUpdatedIndexItem} indexItem The item from the OpenSearch index.
   * @param {IsUpdatedDSpaceItem} dspaceItem The item from DSpace from which we
   * determine if the OpenSearch item needs to be marked as needing update.
   *
   * @returns {boolean} True if the index item should be marked as updated when
   * compared to the same DSpace item.
   */
  isUpdated: (indexItem, dspaceItem) => {
    const esLastModified = new Date(indexItem._source.lastModified);
    const dspaceLastModified = new Date(dspaceItem.lastModified);

    if (esLastModified < dspaceLastModified) return true;

    const indexItemPDFBitstream = indexItem._source.bitstreams
      .find((b) => (b.bundleName === 'ORIGINAL' && b.mimeType === 'application/pdf'));
    const dspaceItemPDFBitstream = dspaceItem.bitstreams
      .find((b) => (b.bundleName === 'ORIGINAL' && b.mimeType === 'application/pdf'));

    if (indexItemPDFBitstream === undefined
      && dspaceItemPDFBitstream === undefined) {
      return false;
    }

    if (indexItemPDFBitstream === undefined
      || dspaceItemPDFBitstream === undefined) {
      return true;
    }

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
   *
   * @returns {Promise<{removed: string[], updated: string[]}>} Object with
   * removed and updated items.
   */
  diff: async (
    openSearchEndpoint,
    dspaceEndpoint
  ) => {
    /** @type {{removed: string[], updated: string[]}} */
    const diffResult = {
      removed: [],
      updated: [],
    };

    const scrollOptions = {
      includes: ['uuid', 'bitstreams', 'lastModified'],
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
              indexItem._source.uuid
            );

            // If we can't find the DSpace item for this UUID consider it
            // deleted. Also, check if the metadata has changed and if so
            // mark it updated. Otherwise consider it unchanged.
            if (dspaceItem === undefined) {
              diffResult.removed.push(indexItem._source.uuid);
            } else if (module.exports.isUpdated(indexItem, dspaceItem)) {
              diffResult.updated.push(indexItem._source.uuid);
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
        _scroll_id
      ));
    }

    // OpenSearch documentation recommends we close the scroll when we're done.
    await osClient.closeScroll(dspaceEndpoint, _scroll_id);

    return diffResult;
  },
};
