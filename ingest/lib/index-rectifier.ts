/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import pMap from 'p-map';
import { z } from 'zod';
import { DSpaceItem, bitstreamSchema } from '../../lib/dspace-schemas';
import * as osClient from '../../lib/open-search-client';
import {
  findPDFBitstreamItem,
  normalizeLastModified,
} from '../../lib/dspace-item';
import { DocumentItem } from '../../lib/open-search-schemas';
import { queueIngestDocument } from './ingest-queue';
import { LambdaClient } from '../../lib/lambda-client';

/**
 * Commits index items that have been marked as out of date by
 * queuing them for re-ingest. Queuing will be done in parallel.
 *
 * @param ids - List of existing index document item IDs that need to be
 * updated.
 * @param ingestTopicArn - SNS Topic ARN where new documents are queued.
 */
export const commitUpdatedItems = async (
  ids: string[],
  ingestTopicArn: string
): Promise<void> => {
  await pMap(
    ids,
    async (id) => {
      try {
        await queueIngestDocument(
          id,
          ingestTopicArn
        );
      } catch (error) {
        console.log(`ERROR: Failed to queue updated document ${JSON.stringify(id)} with error: ${error}`);
      }
    },
    { concurrency: 5 }
  );
};

/**
 * Commits removed items that have been marked as removed by
 * deleting them from the index.
 *
 * @param ids - List of existing index items IDs that need to
 *                         be deleted.
 * @param openSearchEndpoint - Endpoint for the OpenSearch index from
 *                                    which the items should be removed.
 *
 * @returns
 */
export const commitRemovedItems = async (
  ids: string[],
  openSearchEndpoint: string
): Promise<void> => {
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
};

interface IsUpdatedDocumentItem {
  _source: Pick<DocumentItem, 'lastModified' | 'bitstreams'>
}

type IsUpdatedDSpaceItem = Pick<DSpaceItem, 'lastModified' | 'bitstreams'>;

/**
 * Determines whether or not the given index item should be considered out of
 * date when compared to the same dspace item.
 *
 * @param documentItem - The item from the OpenSearch index.
 * @param dspaceItem - The item from DSpace from which we
 * determine if the OpenSearch item needs to be marked as needing update.
 *
 * @returns True if the index item should be marked as updated when
 * compared to the same DSpace item.
 */
export const isUpdated = (
  documentItem: IsUpdatedDocumentItem,
  dspaceItem: IsUpdatedDSpaceItem
): boolean => {
  const esLastModified = new Date(documentItem._source.lastModified);
  const dspaceLastModified = new Date(
    normalizeLastModified(dspaceItem.lastModified)
  );

  if (esLastModified < dspaceLastModified) return true;

  const indexItemPDFBitstream = findPDFBitstreamItem(
    documentItem._source.bitstreams
  );

  const dspaceItemPDFBitstream = findPDFBitstreamItem(
    dspaceItem.bitstreams
  );

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
};

type IndexRectifierDiffResult = {
  updated: string[]
}

/**
 *
 * @param openSearchEndpoint - Endpoint for the OpenSearch index from
 *                                    which the items should be removed.
 * @param dspaceEndpoint - Endpoint for the DSpace repository from which the
 * items should be ingest.
 *
 * @returns Object with removed and updated items.
 */
export const diff = async (
  openSearchEndpoint: string,
  dspaceProxyFunction: string,
  lambda: LambdaClient
): Promise<IndexRectifierDiffResult> => {
  const diffResult: IndexRectifierDiffResult = {
    updated: [],
  };

  const scrollOptions = {
    includes: ['uuid', 'bitstreams', 'lastModified'],
  };

  const hitSchema = z.object({
    _id: z.string(),
    _source: z.object({
      uuid: z.string().uuid(),
      lastModified: z.string(),
      bitstreams: z.array(bitstreamSchema),
    }),
  });

  await osClient.scrollMap({
    esUrl: openSearchEndpoint,
    index: 'documents',
    pMapOptions: { concurrency: 5 },
    scrollOptions,
    handler: async (rawHit) => {
      try {
        const hit = hitSchema.parse(rawHit);

        console.log(`INFO: Diff'ing index item with UUID: ${hit._source.uuid}`);

        const dspaceProxyResponse = await lambda.invoke(
          dspaceProxyFunction,
          JSON.stringify({ uuid: hit._source.uuid })
        );

        const dspaceItem = dspaceProxyResponse === 'undefined'
          ? undefined
          : JSON.parse(dspaceProxyResponse);

        // Check if the metadata has changed and if so
        // mark it updated. Otherwise consider it unchanged.
        if (dspaceItem !== undefined && isUpdated(hit, dspaceItem)) {
          diffResult.updated.push(hit._source.uuid);
        }
      } catch (error) {
        console.log(`ERROR: Encountered error: ${error} for diff of item: ${JSON.stringify(rawHit)}`);
      }
    },
  });

  return diffResult;
};
