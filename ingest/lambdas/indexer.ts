/* eslint-disable no-underscore-dangle */
import { z } from 'zod';
import _ from 'lodash';
import pMap from 'p-map';
import { zodTypeGuard } from '../../lib/zod-utils';
import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import {
  Bitstream,
  DSpaceItem,
  dspaceItemSchema,
  Metadata,
} from '../../lib/dspace-schemas';
import { documentItemSchema } from '../../lib/open-search-schemas';

import { findThumbnailBitstreamItem } from '../../lib/dspace-item';
import * as s3Utils from '../../lib/s3-utils';

export const getDSpaceItemFields = async (
  dspaceItemBucket: string,
  dspaceItemKey: string
): Promise<DSpaceItem> => {
  const s3Location = new s3Utils.S3ObjectLocation(
    dspaceItemBucket,
    dspaceItemKey
  );

  return await s3Utils.safeGetObjectJson(
    s3Location,
    dspaceItemSchema.passthrough()
  );
};

interface BitstreamTextSource {
  _bitstreamText: string
  _bitstreamTextKey: string
}

export const getBitstreamTextSource = async (
  bitstreamTextBucket: string,
  bitstreamTextKey: string
): Promise<BitstreamTextSource> => {
  const bitstreamText = await s3Utils.getObjectText(
    new s3Utils.S3ObjectLocation(bitstreamTextBucket, bitstreamTextKey)
  );

  return {
    _bitstreamText: bitstreamText,
    _bitstreamTextKey: bitstreamTextKey,
  };
};

type MetadataSearchFields = Record<string, string | string[]>;

export const getMetadataSearchFields = (
  metadata: Metadata[]
): MetadataSearchFields => {
  const searchFields: MetadataSearchFields = {};

  for (const m of metadata) {
    const key = m.key.replace(/\./g, '_');

    const searchFieldValue = searchFields[key];
    searchFields[key] = searchFieldValue !== undefined
      ? [searchFieldValue, m.value].flat()
      : m.value;
  }

  return searchFields;
};

interface ThumbnailRetrieveLink {
  _thumbnailRetrieveLink: string
}

export const getThumbnailRetrieveLink = (
  bitstreams: Bitstream[]
): ThumbnailRetrieveLink | undefined => {
  const thumbnailBitstream = findThumbnailBitstreamItem(bitstreams);
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

const textExtractorSnsEventSchema = z.object({
  Records: z.array(
    z.object({
      Sns: z.object({
        Message: z.string().min(1), // This string should be an S3 Record.
      }),
    })
  ).nonempty(),
});

const textExtractorS3RecordSchema = z.object({
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

const isTextExtractorSnsEventSchema = zodTypeGuard(textExtractorSnsEventSchema);

const isExplicitInvokeEventSchema = zodTypeGuard(explicitInvokeEventSchema);

interface IngestRecord {
  uuid: string
  bitstreamTextKey?: string
  bitstreamTextBucket?: string
}

const parseEvent = (event: unknown): IngestRecord[] => {
  if (isTextExtractorSnsEventSchema(event)) {
    return _.map(
      event.Records,
      (record) => {
        const messageData = textExtractorS3RecordSchema.parse(
          JSON.parse(record.Sns.Message)
        );

        const bitstreamTextBucket = messageData.Records[0].s3.bucket.name;
        const bitstreamTextKey = messageData.Records[0].s3.object.key;
        const [uuid] = bitstreamTextKey.split('.');

        if (!uuid) {
          throw new Error(`Ingest indexer event missing UUID ${JSON.stringify(event)}`);
        }

        return {
          bitstreamTextBucket,
          bitstreamTextKey,
          uuid,
        };
      }
    );
  }

  if (isExplicitInvokeEventSchema(event)) {
    return [{
      uuid: event.uuid,
    }];
  }

  throw new Error(`Ingest indexer invoked with unknown event: ${JSON.stringify(event)}`);
};

const index = async (
  ingestRecord: IngestRecord,
  dspaceItemBucket: string,
  openSearchEndpoint: string
): Promise<void> => {
  // Get the DSpace item that starts this all off.
  const dspaceItem = await getDSpaceItemFields(
    dspaceItemBucket,
    `${ingestRecord.uuid}.json`
  );

  // Get the PDF source if it exists.
  let bitstreamSource: BitstreamTextSource | undefined;
  if (ingestRecord.bitstreamTextBucket && ingestRecord.bitstreamTextKey) {
    bitstreamSource = await getBitstreamTextSource(
      ingestRecord.bitstreamTextBucket,
      ingestRecord.bitstreamTextKey
    );
  }

  // Promote the metadata fields to make search easier. Since the metadata
  // is dynamic we validate that the dc.title field exists.
  // TODO: As we add explicit search fields we could turn this into a type.
  const metadataSearchFields = z.object({ dc_title: z.string() })
    .passthrough()
    .parse(getMetadataSearchFields(dspaceItem.metadata));

  // Get the thumbnail retrieve link to make it easier for the UI to render
  // search results.
  const thumbnailRetrieveLink = getThumbnailRetrieveLink(
    dspaceItem.bitstreams
  );

  // Get terms.
  const title = metadataSearchFields.dc_title;
  const contents = bitstreamSource?._bitstreamText || '';
  const terms = await getTerms(
    openSearchEndpoint,
    {
      title,
      contents,
    }
  );

  const documentItem = documentItemSchema.parse({
    ...dspaceItem,
    ...bitstreamSource,
    ...metadataSearchFields,
    ...thumbnailRetrieveLink,
    ...terms,
  });

  // Index our document item.
  await osClient.putDocumentItem(openSearchEndpoint, documentItem);

  console.log(`INFO: Indexed document item ${documentItem.uuid}`);
};

export const handler = async (event: unknown) => {
  const dspaceItemBucket = getStringFromEnv('DOCUMENT_METADATA_BUCKET');
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');

  const ingestRecords = parseEvent(event);

  // Make sure the documents index exists before we create documents. If the
  // index exists we'll catch the error and move on.
  try {
    await osClient.createDocumentsIndex(openSearchEndpoint, 'documents');
  } catch (error) {
    if (error instanceof Error
      && error.message !== 'resource_already_exists_exception') {
      console.log(`ERROR: Failed to create documents index: ${error}`);
      throw error;
    }
  }

  await pMap(
    ingestRecords,
    async (record) => index(
      record,
      dspaceItemBucket,
      openSearchEndpoint
    ),
    { concurrency: 1 }
  );
};
