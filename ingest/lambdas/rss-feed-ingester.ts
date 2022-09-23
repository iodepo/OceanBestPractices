/* eslint-disable import/no-unresolved, import/extensions */
import pMap from 'p-map';
import * as dspaceClient from '../../lib/dspace-client';
import * as ingestQueue from '../lib/ingest-queue';
import { getStringFromEnv } from '../../lib/env-utils';
import { getObjectText, putText, S3ObjectLocation } from '../../lib/s3-utils';

/**
 * Fetches a DSpace RSS feed and determines whether or not the documents
 * listed in the feed should be queued for ingest. This is determined by
 * checking the published date of the feed, and whether or not it has been
 * published (updated) since the last time we checked it.
 */
export const handler = async () => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const ingestTopicArn = getStringFromEnv('INGEST_TOPIC_ARN');
  const pubDateBucket = getStringFromEnv('FEED_INGESTER_PUB_DATE_BUCKET');

  // If we run into any errors we force publish the feed to be safe.
  let forcePublishing = false;

  // Default to the earliest time possible.
  let lastKnownPublishedDate = new Date(+0);

  const pubDateS3Location = new S3ObjectLocation(
    pubDateBucket,
    'pubDate.txt'
  );

  try {
    // Fetch the last known feed publication date.
    const lastKnownPublishedDateString = await getObjectText(pubDateS3Location);
    lastKnownPublishedDate = new Date(lastKnownPublishedDateString);

    console.log(`INFO: Last known RSS feed publication date is ${lastKnownPublishedDate}`);
  } catch (error) {
    console.log(`ERROR: Fetching RSS feed last known published date: ${error}. Forcing publication.`);
    forcePublishing = true;
  }

  try {
    // Fetch the RSS feed from DSpace.
    const feed = await dspaceClient.getFeed(dspaceEndpoint);

    // Parse out the last published date and use it to determine whether or
    // not we should index new documents.
    const feedLastPublished = new Date(feed.channel[0].pubDate[0]._);

    const feedIsUpdated = feedLastPublished > lastKnownPublishedDate;

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
          // @ts-expect-error Figure this typing out later.
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

    // Save the latest published date.
    await putText(
      pubDateS3Location,
      feedLastPublished.toString()
    );
  } catch (error) {
    console.log(`ERROR: Failed to fetch or parse DSpace RSS feed with error: ${error}`);
    throw error;
  }
};

module.exports = { handler };
