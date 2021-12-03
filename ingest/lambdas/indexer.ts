/* eslint-disable no-underscore-dangle */
// import { object } from 'zod';
import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import type { Bitstream, DSpaceItem, Metadata } from '../../lib/dspace-types';
// import type { DocumentItem } from '../../lib/open-search-schemas';

import { thumbnailBitstreamItem } from '../../lib/dspace-item';
import * as s3Client from '../../lib/s3-client';
import { DocumentItem } from '../../lib/open-search-schemas';

// const snsEventSchema =

export const buildDSpaceFields = (
  target: Record<string, unknown>,
  dspaceItem: DSpaceItem
): Record<string, unknown> => ({
  ...target,
  ...dspaceItem,
});

export interface BuildBitstreamSourceParams {
  bitstreamTextBucket: string | undefined
  bitstreamTextKey: string | undefined
  region: string
}

export const buildBitstreamSource = async (
  target: Record< string, string | unknown>,
  params: BuildBitstreamSourceParams
): Promise<Record<string, unknown>> => {
  const {
    bitstreamTextBucket,
    bitstreamTextKey,
    region = 'us-east-1',
  } = params;

  if (!bitstreamTextBucket || !bitstreamTextKey) {
    return target;
  }

  const bitstreamText = await s3Client.getStringObject(
    bitstreamTextBucket,
    bitstreamTextKey,
    region
  );

  return {
    ...target,
    _bitstreamText: bitstreamText,
    _bitstreamTextKey: bitstreamTextKey,
  };
};

export const buildMetadataSearchFields = (
  target: Record<string, unknown>,
  metadataItems: Metadata[]
): Record<string, unknown> => {
  const searchFields: Record<string, string | string[]> = {};

  // eslint-disable-next-line unicorn/no-array-for-each
  metadataItems.forEach((metadata: Metadata) => {
    const key = metadata.key.replace(/\./g, '_');

    const searchFieldValue = searchFields[key];
    searchFields[key] = searchFieldValue !== undefined
      ? [searchFieldValue, metadata.value].flat()
      : metadata.value;
  });

  return {
    ...target,
    ...searchFields,
  };
};

export const buildThumbnailRetrieveLink = (
  target: Record<string, unknown>,
  bitstreamItems: Bitstream[]
): Record<string, unknown> => {
  const thumbnailBitstream = thumbnailBitstreamItem(bitstreamItems);
  if (!thumbnailBitstream) {
    return target;
  }

  return {
    ...target,
    _thumbnailRetrieveLink: thumbnailBitstream.retrieveLink,
  };
};

export const buildTerms = async (
  target: Pick<DocumentItem, '_dc_title' | '_bitstreamText'>,
  openSearchEndpoint: string
) => {
  const title = target._dc_title || '';
  const contents = target._bitstreamText || '';

  const terms = await osClient.percolateDocumentFields(
    openSearchEndpoint,
    {
      title,
      contents,
    }
  );

  return {
    ...target,
    _terms: terms,
  };
};

export const handler = async (event: any) => {
  const metadataBucketName = getStringFromEnv('DOCUMENT_METADATA_BUCKET');
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');
  const region = getStringFromEnv('AWS_REGION');

  let bitstreamTextBucket; let bitstreamTextKey; let uuid;

  if (event.Records !== undefined && event.Records.length > 0) {
    const message = JSON.parse(event.Records[0].Sns.Message);
    bitstreamTextBucket = message.Records[0].s3.bucket.name;
    bitstreamTextKey = message.Records[0].s3.object.key;
    [uuid] = bitstreamTextKey.split('.');
  } else {
    uuid = event['uuid'];
  }

  console.log(`INFO: Preparing DSpace item ${uuid} for indexing.`);

  // Get the DSpace item we're going to index.
  // TODO: Parse this object to make sure we have a DSpace item.
  const dspaceItem = (await s3Client.getJSONObject(
    metadataBucketName,
    `${uuid}.json`,
    region
  ) as DSpaceItem);

  // Start building our document item.
  let documentItem: Record<string, unknown> = buildDSpaceFields({}, dspaceItem);

  // Add the PDF source if it exists.
  documentItem = await buildBitstreamSource(
    documentItem,
    {
      bitstreamTextBucket,
      bitstreamTextKey,
      region,
    }
  );

  // Promote the metadata fields to make search easier.
  documentItem = buildMetadataSearchFields(
    documentItem,
    dspaceItem.metadata
  );

  // Add the thumbnail retrieve link to make it easier for the UI to render
  // search results.
  documentItem = buildThumbnailRetrieveLink(
    documentItem,
    dspaceItem.bitstreams
  );

  // Add terms.
  documentItem = await buildTerms(
    documentItem,
    openSearchEndpoint
  );

  // Index our document item.
  await osClient.putDocumentItem(
    openSearchEndpoint,
    documentItem
  );

  { console.log(`INFO: Indexed document item ${documentItem['uuid']}`); }
};
