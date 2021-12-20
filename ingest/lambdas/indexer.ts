/* eslint-disable no-underscore-dangle */

// @ts-expect-error This package does not have types available
import PDFParser from 'pdf2json';
import got from 'got';
import { z } from 'zod';
import pMap from 'p-map';
import { curry } from 'lodash';
import * as osClient from '../../lib/open-search-client';
import {
  Bitstream,
  DSpaceItem,
  dspaceItemSchema,
  Metadata,
} from '../../lib/dspace-schemas';
import { documentItemSchema } from '../../lib/open-search-schemas';

import {
  findMetadataItems,
  findPDFBitstreamItem,
  findThumbnailBitstreamItem,
} from '../../lib/dspace-item';
import * as s3Utils from '../../lib/s3-utils';
import { deleteMessage, receiveMessage, SqsMessage } from '../../lib/sqs-utils';

const getUrlBuffer = (url: string): Promise<Buffer> => got.get(url).buffer();

const textFromPdfBuffer = (buffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', reject);

    pdfParser.on(
      'pdfParser_dataReady',
      () => resolve(pdfParser.getRawTextContent())
    );

    pdfParser.parseBuffer(buffer);
  });

const fetchPdfText = async (url: string): Promise<string> =>
  getUrlBuffer(url).then(textFromPdfBuffer);

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

export interface PrimaryAuthor {
  _primaryAuthor: string
}

export const getPrimaryAuthor = (
  metadata: Metadata[]
): PrimaryAuthor | undefined => {
  const [primaryAuthor] = findMetadataItems(metadata, 'dc.contributor.author');
  if (primaryAuthor) {
    return {
      _primaryAuthor: primaryAuthor.value,
    };
  }

  return undefined;
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

const createIndexes = (esUrl: string) => Promise.all([
  osClient.createDocumentsIndex(esUrl, 'documents'),
  osClient.createTermsIndex(esUrl, 'terms'),
]);

interface Config {
  documentSourceBucket: string;
  dspaceUrl: string;
  esUrl: string;
  queueUrl: string;
}

const getMessages = async (queueUrl: string): Promise<SqsMessage[]> =>
  receiveMessage(queueUrl).then((r) => r.Messages);

const index = async (
  config: Config,
  dspaceItem: DSpaceItem
  // ingestRecord: IndexerRequest,
  // dspaceItemBucket: string,
  // openSearchEndpoint: string
): Promise<void> => {
  console.log(`INFO: Indexing DSpace item ${dspaceItem.uuid}`);

  const { documentSourceBucket, dspaceUrl, esUrl } = config;

  // Promote the metadata fields to make search easier. Since the metadata
  // is dynamic we validate that the dc.title field exists.
  // TODO: As we add explicit search fields we could turn this into a type.
  const metadataSearchFields = z.object({ dc_title: z.string() })
    .catchall(z.unknown())
    .parse(getMetadataSearchFields(dspaceItem.metadata));

  const primaryAuthor = getPrimaryAuthor(dspaceItem.metadata);

  // Get the thumbnail retrieve link to make it easier for the UI to render
  // search results.
  const thumbnailRetrieveLink = getThumbnailRetrieveLink(
    dspaceItem.bitstreams
  );

  // Get terms.
  const title = metadataSearchFields.dc_title;

  let contents = title;

  const pdfBitstream = findPDFBitstreamItem(dspaceItem.bitstreams);

  if (pdfBitstream) {
    const pdfUrl = `${dspaceUrl}${pdfBitstream.retrieveLink}`;

    // TODO We are downloading this file twice here, once to parse it and again
    // to save it to S3. Can we stream it once to two destinations?

    contents = await fetchPdfText(pdfUrl);

    await s3Utils.uploadStream(
      documentSourceBucket,
      `${dspaceItem.uuid}.pdf`,
      got.stream(pdfUrl)
    );
  }

  const terms = await getTerms(
    esUrl,
    {
      title,
      contents,
    }
  );

  const documentItem = documentItemSchema.parse({
    ...dspaceItem,
    ...metadataSearchFields,
    ...primaryAuthor,
    ...thumbnailRetrieveLink,
    ...terms,
  });

  // Index our document item.
  await osClient.putDocumentItem(esUrl, documentItem);

  console.log(`INFO: Indexed document item ${documentItem.uuid}`);
};

const messageHandler = curry(
  async (config: Config, message: SqsMessage) => {
    const dspaceItem = dspaceItemSchema.parse(message.Body);

    await index(config, dspaceItem);

    await deleteMessage(config.queueUrl, message.ReceiptHandle);
  }
);

const processIngestQueue = async (config: Config): Promise<void> => {
  let messages: SqsMessage[];
  do {
    /* eslint-disable no-await-in-loop */
    messages = await getMessages(config.queueUrl);

    await pMap(
      messages,
      messageHandler(config),
      { concurrency: 1 }
    );
    /* eslint-enable no-await-in-loop */
  } while (messages.length > 0);
};

const envSchema = z.object({
  DOCUMENT_SOURCE_BUCKET: z.string().min(1),
  DSPACE_ITEM_INGEST_QUEUE_URL: z.string().url(),
  DSPACE_URL: z.string().url(),
  OPEN_SEARCH_ENDPOINT: z.string().url(),
});

const loadConfigFromEnv = (): Config => {
  const env = envSchema.parse(process.env);

  return {
    documentSourceBucket: env.DOCUMENT_SOURCE_BUCKET,
    dspaceUrl: env.DSPACE_URL,
    esUrl: env.OPEN_SEARCH_ENDPOINT,
    queueUrl: env.DSPACE_ITEM_INGEST_QUEUE_URL,
  };
};

export const handler = async () => {
  const config = loadConfigFromEnv();

  await createIndexes(config.esUrl);

  await processIngestQueue(config);
};
