/* eslint-disable import/no-unresolved, import/extensions */
// @ts-check
const pMap = require('p-map');

const dspaceClient = require('../../lib/dspace-client');
const ingestQueue = require('../lib/ingest-queue');

const dspaceFeedReadInterval = process.env.DSPACE_FEED_READ_INTERVAL
  ? Number.parseInt(process.env.DSPACE_FEED_READ_INTERVAL)
  : 300;

/**
 * Returns a boolean indiciting whether or not we shoudl publish documents
 * from the RSS feed based on when the RSS feed was published and the
 * last time we checked it. Set the `feedReadInterval` to -1 to always
 * pass this test.
 *
 * @param {Date} publishedDate The published date of the RSS feed.
 * @param {number} feedReadInterval The number in seconds since the
 * published RSS feed was last read.
 *
 * @returns {boolean} Whether or not we should publish new documents based
 *          on the last time we checked the RSS feed
 */
const shouldQueuePublishedDocuments = (publishedDate, feedReadInterval) => {
  if (feedReadInterval === -1) {
    return true;
  }

  const feedReadIntervalDate = new Date();
  feedReadIntervalDate.setSeconds(feedReadInterval * -1);

  return publishedDate >= feedReadIntervalDate;
};

/**
 * Fetches a DSpace RSS feed and determines whether or not the documents
 * listed in the feed should be queued for ingest. This is determined by
 * checking the published date of the feed, and whether or not it has been
 * published (updated) since the last time we checked it.
 */
const handler = async () => {
  try {
    // Fetch the RSS feed from DSpace.
    const feed = await dspaceClient.getFeed(process.env.DSPACE_ENDPOINT);

    // Parse out the last published date and use it to determine whether or
    // not we should index new documents.
    const lastPublishedDate = new Date(feed.channel[0].pubDate[0]._);
    if (!shouldQueuePublishedDocuments(
      lastPublishedDate,
      dspaceFeedReadInterval
    )) {
      return;
    }

    // Loop through the feed items and queue them for ingest. In order to do
    // this we have to fetch the metadata for each item based on the
    // dc.identifier.uri field since that's all that is available in the feed.
    // This identifier doesn't have a consistent domain so we use the UUID for
    // ingest queuing.
    await pMap(
      feed.channel[0].item,
      async (feedItem) => {
        const dspaceItems = await dspaceClient.find(
          process.env.DSPACE_ENDPOINT,
          'dc.identifier.uri',
          feedItem.link[0]
        );

        if (dspaceItems.length > 0) {
          const dspaceItem = dspaceItems[0];
          await ingestQueue.queueIngestDocument(
            dspaceItem.uuid,
            process.env.INGEST_TOPIC_ARN
          );

          console.log(`INFO: Queued item ${dspaceItem.uuid} for ingest.`);
        }
      },
      { concurrency: 5 }
    );
  } catch (error) {
    console.log(`ERROR: Failed to fetch or parse DSpace RSS feed with error: ${error}`);
  }
};

module.exports = handler;
