/* eslint-disable import/no-unresolved, import/extensions */
const pMap = require('p-map');

const dspaceClient = require('../../lib/dspace-client');
const ingestQueue = require('../lib/ingest-queue');
const { getIntFromEnv, getStringFromEnv } = require('../../lib/env-utils');

/**
 * Fetches a DSpace RSS feed and determines whether or not the documents
 * listed in the feed should be queued for ingest. This is determined by
 * checking the published date of the feed, and whether or not it has been
 * published (updated) since the last time we checked it.
 */
const handler = async () => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const ingestTopicArn = getStringFromEnv('INGEST_TOPIC_ARN');
  const dspaceFeedReadInterval = getIntFromEnv('DSPACE_FEED_READ_INTERVAL', 300);

  const forcePublishing = dspaceFeedReadInterval === -1;

  try {
    // Fetch the RSS feed from DSpace.
    const feed = await dspaceClient.getFeed(dspaceEndpoint);

    // Parse out the last published date and use it to determine whether or
    // not we should index new documents.
    const feedLastPublished = new Date(feed.channel[0].pubDate[0]._);

    const ingesterLastRun = new Date(Date.now() - dspaceFeedReadInterval);

    const feedIsUpdated = feedLastPublished > ingesterLastRun;

    const processFeed = forcePublishing || feedIsUpdated;

    if (!processFeed) return;

    // Loop through the feed items and queue them for ingest. In order to do
    // this we have to fetch the metadata for each item based on the
    // dc.identifier.uri field since that's all that is available in the feed.
    // This identifier doesn't have a consistent domain so we use the UUID for
    // ingest queuing.
    await pMap(
      feed.channel[0].item,
      async (feedItem) => {
        const [dspaceItem] = await dspaceClient.find(
          dspaceEndpoint,
          'dc.identifier.uri',
          feedItem.link[0]
        );

        if (dspaceItem === undefined) return;

        await ingestQueue.queueIngestDocument(
          dspaceItem.uuid,
          ingestTopicArn
        );

        console.log(`INFO: Queued item ${dspaceItem.uuid} for ingest.`);
      },
      { concurrency: 5 }
    );
  } catch (error) {
    console.log(`ERROR: Failed to fetch or parse DSpace RSS feed with error: ${error}`);
    throw error;
  }
};

module.exports = handler;
