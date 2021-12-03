/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import { z } from 'zod';
import { zodTypeGuard } from '../../lib/zod-utils';
import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import {
  Bitstream,
  DSpaceItem,
  dspaceItemSchema,
  Metadata,
} from '../../lib/dspace-schemas';

import { thumbnailBitstreamItem } from '../../lib/dspace-item';
import * as s3Client from '../../lib/s3-utils';
import { DocumentItem } from '../../lib/open-search-schemas';

export const getDSpaceItemFields = async (
  dspaceItemBucket: string,
  dspaceItemKey: string
): Promise<DSpaceItem> => {
  const s3Location = new s3Client.S3ObjectLocation(
    dspaceItemBucket,
    dspaceItemKey
  );

  return await s3Client.safeGetObjectJson(
    s3Location,
    dspaceItemSchema.passthrough()
  );
};

export interface BitstreamSource {
  _bitstreamText: string
  _bitstreamTextKey: string
}

export const getBitstreamSource = async (
  bitstreamTextBucket: string,
  bitstreamTextKey: string
): Promise<BitstreamSource> => {
  const bitstreamText = await s3Client.getObjectText(
    new s3Client.S3ObjectLocation(bitstreamTextBucket, bitstreamTextKey)
  );

  return {
    _bitstreamText: bitstreamText,
    _bitstreamTextKey: bitstreamTextKey,
  };
};
export interface MetadataSearchFields {
  _dc_title: string,
}

export const getMetadataSearchFields = (
  metadata: Metadata[]
): Record<string, string | string[]> => {
  const searchFields: Record<string, string | string[]> = {};

  // eslint-disable-next-line unicorn/no-array-for-each
  metadata.forEach((m: Metadata) => {
    const key = m.key.replace(/\./g, '_');

    const searchFieldValue = searchFields[key];
    searchFields[key] = searchFieldValue !== undefined
      ? [searchFieldValue, m.value].flat()
      : m.value;
  });

  return searchFields;
};

export interface ThumbnailRetrieveLink {
  _thumbnailRetrieveLink: string
}

export const getThumbnailRetrieveLink = (
  bitstreams: Bitstream[]
): ThumbnailRetrieveLink | undefined => {
  const thumbnailBitstream = thumbnailBitstreamItem(bitstreams);
  if (thumbnailBitstream) {
    return {
      _thumbnailRetrieveLink: thumbnailBitstream.retrieveLink,
    };
  }

  return undefined;
};

export const getTerms = async (
  openSearchEndpoint: string,
  percolateFields: { title: string, contents: string }
) => {
  const terms = await osClient.percolateDocumentFields(
    openSearchEndpoint,
    percolateFields
  );

  return {
    _terms: terms,
  };
};

const explicitInvokeEventSchema = z.object({
  uuid: z.string().uuid(),
});

const snsEventSchema = z.object({
  Records: z.array(
    z.object({
      Sns: z.object({
        Message: z.string().min(2),
      }),
    })
  ).nonempty(),
});

const s3NotificationSchema = z.object({
  Records: z.array(
    z.object({
      s3: z.object({
        bucket: z.object({
          name: z.string().min(1),
        }),
        object: z.object({
          key: z.string().min(1),
        }),
      }),
    })
  ).nonempty(),
});

const isSnsEventSchema = zodTypeGuard(snsEventSchema);

const isExplicitInvokeEventSchema = zodTypeGuard(explicitInvokeEventSchema);

export const handler = async (event: unknown) => {
  const dspaceItemBucket = getStringFromEnv('DOCUMENT_METADATA_BUCKET');
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');

  let bitstreamTextBucket; let bitstreamTextKey; let uuid;
  if (isSnsEventSchema(event)) {
    const messageData = s3NotificationSchema.parse(
      JSON.parse(event.Records[0].Sns.Message)
    );

    bitstreamTextBucket = messageData.Records[0].s3.bucket.name;
    bitstreamTextKey = messageData.Records[0].s3.object.key;
    [uuid] = bitstreamTextKey.split('.');
  } else if (isExplicitInvokeEventSchema(event)) {
    uuid = event.uuid;
  } else {
    throw new Error('ERROR: Ingest indexer invoked with unknown event.');
  }

  console.log(`INFO: Preparing DSpace item ${uuid} for indexing.`);

  // Validate that we have a DSpace item because we can't do anything
  // without it. Let's throw an error here because this really shouldn't happen
  // and if it does we want to know about it.
  const dspaceItem = await getDSpaceItemFields(
    dspaceItemBucket,
    `${uuid}.json`
  );

  // Promote the metadata fields to make search easier. Since the metadata
  // is dynamic we validate that the dc.title field exists.
  const metadataSearchFields = z.object({ _dc_title: z.string() })
    .passthrough()
    .parse(getMetadataSearchFields(dspaceItem.metadata));

  // Add the thumbnail retrieve link to make it easier for the UI to render
  // search results.
  const thumbnailRetrieveLink = getThumbnailRetrieveLink(
    dspaceItem.bitstreams
  );

  // Add the PDF source if it exists.
  let bitstreamSource: BitstreamSource | undefined;
  if (bitstreamTextBucket && bitstreamTextKey) {
    bitstreamSource = await getBitstreamSource(
      bitstreamTextBucket,
      bitstreamTextKey
    );
  }

  // Add terms.
  const title = metadataSearchFields._dc_title;
  const contents = bitstreamSource?._bitstreamText || '';
  const terms = await getTerms(
    openSearchEndpoint,
    {
      title,
      contents,
    }
  );

  const documentItem: DocumentItem = {
    ...dspaceItem,
    ...bitstreamSource,
    ...metadataSearchFields,
    ...thumbnailRetrieveLink,
    ...terms,
  };

  // Index our document item.
  await osClient.putDocumentItem(
    openSearchEndpoint,
    documentItem
  );

  console.log(`INFO: Indexed document item ${documentItem.uuid}`);
};
