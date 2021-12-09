/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import pMap from 'p-map';

import * as dspaceClient from '../../lib/dspace-client';
import { DSpaceItem } from '../../lib/dspace-schemas';
import * as osClient from '../../lib/open-search-client';
import { findPDFBitstreamItem } from '../../lib/dspace-item';
import {
  DocumentItem,
  openSearchScrollDocumentsResponseSchema,
} from '../../lib/open-search-schemas';
import { queueIngestDocument } from './ingest-queue';

/**
 * Commits index items that have been marked as out of date by
 * queuing them for re-ingest. Queuing will be done in parallel.
 *
 * @param ids - List of existing index document item IDs that need to be
 * updated.
 * @param ingestTopicArn - SNS Topic ARN where new documents are queued.
 * @param region - AWS region containing the infrastructure.
 * @returns
 */
export const commitUpdatedItems = async (
  ids: string[],
  ingestTopicArn: string,
  region = 'us-east-1'
): Promise<void> => {
  if (ids.length === 0) return;

  await pMap(
    ids,
    async (id) => {
      try {
        await queueIngestDocument(
          id,
          ingestTopicArn,
          region
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
  const dspaceLastModified = new Date(dspaceItem.lastModified);

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
  removed: string[],
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
  dspaceEndpoint: string
): Promise<IndexRectifierDiffResult> => {
  const diffResult: IndexRectifierDiffResult = {
    removed: [],
    updated: [],
  };

  const scrollOptions = {
    includes: ['uuid', 'bitstreams', 'lastModified'],
  };

  const rawOpenScrollResponse = await osClient.openScroll(
    openSearchEndpoint,
    'documents',
    scrollOptions
  );

  const openScrollResponse = openSearchScrollDocumentsResponseSchema.safeParse(
    rawOpenScrollResponse
  );

  if (!openScrollResponse.success) {
    console.log(`ERROR: Failed to scroll documents: ${openScrollResponse.error}`);
    return diffResult;
  }

  let { _scroll_id, hits: { hits } } = openScrollResponse.data;

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

    // eslint-disable-next-line no-await-in-loop
    const rawNextScrollResponse = await osClient.nextScroll(
      openSearchEndpoint,
      _scroll_id
    );

    const nextScrollResponse = openSearchScrollDocumentsResponseSchema
      .safeParse(
        rawNextScrollResponse
      );

    if (!nextScrollResponse.success) {
      console.log(`ERROR: Failed to continue documents scroll: ${nextScrollResponse.error}`);
      hits = [];
    } else {
      // eslint-disable-next-line camelcase
      ({ _scroll_id, hits: { hits } } = nextScrollResponse.data);
    }
  }

  // OpenSearch documentation recommends we close the scroll when we're done.
  await osClient.closeScroll(dspaceEndpoint, _scroll_id);

  return diffResult;
};
