import { DSpaceItem, Metadata } from '../../lib/dspace-types';
import { getStringFromEnv } from '../../lib/env-utils';
import * as osClient from '../../lib/open-search-client';
import { DocumentItem } from '../../lib/open-search-types';

// @ts-expect-error We need to migrate this file to TS or add a types file
// for it
import * as s3Client from '../../lib/s3-client';

const metadataBucketName = process.env['DOCUMENT_METADATA_BUCKET'];

/**
 * The mapping defines the translations between the DSpace repository field names
 * and our internal Elasticsearch index.
 */
const mapping = {
  // contents: 'contents',
  'dc.bibliographicCitation.title': 'journal_title',
  'dc.contributor.author': 'author',
  'dc.contributor.corpauthor': 'corp_author',
  'dc.contributor.editor': 'editor',
  'dc.coverage.spatial': 'coverage_spatial',
  'dc.date.issued': 'issued_date',
  'dc.description.abstract': 'abstract',
  'dc.description.bptype': 'bptype',
  'dc.description.currentstatus': 'current_status',
  'dc.description.eov': 'essential_ocean_variables',
  'dc.description.maturitylevel': 'maturity_level',
  'dc.description.notes': 'notes',
  'dc.description.refereed': 'refereed',
  'dc.description.sdg': 'sustainable_development_goals',
  'dc.description.status': 'publication_status',
  'dc.identifier.citation': 'citation',
  'dc.identifier.doi': 'identifier_doi',
  'dc.identifier.orcid': 'identifier_orcid',
  'dc.language.iso': 'language',
  'dc.publisher': 'publisher',
  'dc.relation.ispartofseries': 'relation_is_part_of_series',
  'dc.relation.uri': 'relation_uri',
  'dc.resource.uri': 'resource_uri',
  'dc.subject.dmProcesses': 'subjects_dm_processes',
  'dc.subject.instrumentType': 'subjects_instrument_type',
  'dc.subject.other': 'subjects_other',
  'dc.subject.parameterDiscipline': 'subjects_parameter_discipline',
  'dc.title': 'title',
  'dc.title.alternative': 'title_alt',
  'dc.type': 'type',
  // handle: 'handle',
  // sourceKey: 'sourceKey',
  // terms: 'terms',
  thumbnail: 'thumbnail',
  // uuid: 'uuid',
  // lastModified: 'lastModified',
  // bitstreams: 'bitstreams',
};

const buildMetadataSearchFields = (
  metadataItems: Metadata[]
): Record<string, string | string[]> => {
  // TODO: This might need to be an array.
  const searchFields: Record<string, string | string[]> = {};

  // eslint-disable-next-line unicorn/no-array-for-each
  metadataItems.forEach((metadata: Metadata) => {
    const key = metadata.key.replace('.', '_');
    searchFields[key] = metadata.value;
  });

  return searchFields;
};

const buildBitstreamSourceKey = () => {};

const buildBitstreamText = () => {};

const buildPrimaryAuther = () => {};

const buildTerms = async () => {};

const buildThumbnailRetrieveLink = () => {};

export const handler = async (event: unknown) => {
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');
  const region = getStringFromEnv('AWS_REGION');

  let uuid; let contentsBucketName; let contentsKey;

  if (event.Records !== undefined && event.Records.length > 0) {
    const message = JSON.parse(event.Records[0].Sns.Message);
    contentsBucketName = message.Records[0].s3.bucket.name;
    contentsKey = message.Records[0].s3.object.key;
    [uuid] = contentsKey.split('.');
  } else {
    uuid = event.uuid;
  }

  console.log(`INFO: Preparing DSpace item ${uuid} for indexing.`);

  // Get the DSpace item we're going to index.
  const dspaceItem = await s3Client.getJSONObject(
    metadataBucketName,
    `${uuid}.json`,
    region
  );

  // Start building our document item.
  const documentItem = {};
  Object.assign(documentItem, dspaceItem);

  // Promote the metadata fields to make search easier.
  // eslint-disable-next-line unicorn/no-array-for-each
  Object.assign(documentItem, buildMetadataSearchFields(dspaceItem.metadata));

  // Promote custom fields.
  Object.assign(documentItem, buildCustomSearchFields(dspaceItem));

  // Get the title attribute to percolate later.
  const percolateFields = {
    title: documentItem.title,
  };

  // Get the bitstream text if it exists.
  if (contentsBucketName && contentsKey) {
    const contents = await s3Client.getStringObject(
      contentsBucketName,
      contentsKey,
      region
    );

    // Add it to our document item.
    documentItem.contents = contents;

    // Add the source key to our document item.
    documentItem.sourceKey = `${uuid}.pdf`;

    // Add it to the percolateFields.
    percolateFields.contents = contents;
  }

  // Tag the DSpace item and add the results to the document item...
  const terms = await osClient.percolateDocumentFields(
    openSearchEndpoint,
    percolateFields,
    { region }
  );
  // Add terms to our document item.
  documentItem.terms = terms;

  // Add our thumbnail retrieve link.
  const { thumbnailBitstreamItem } = dspaceItem;
  if (thumbnailBitstreamItem) {
    documentItem.thumbnailRetrieveLink = thumbnailBitstreamItem.retrieveLink;
  }

  // Index our document item.
  await osClient.putDocumentItem(
    openSearchEndpoint,
    documentItem
  );

  console.log(`INFO: Indexed document item ${documentItem.uuid}`);
};

/**
 * Iterates through our target fields and extracts the values from the original
 * document matadata copying them to a map that matches our internal Elasticsearch
 * index. Processes fields individually to handle special cases like arrays.
 * @param {object} metadata The original document metadata
 * @returns Object with keys/values ready for indexing in our Elasticsearch index
 */
// function mapMetadata(metadata) {
//   const indexDoc = {};

//   for (const data of metadata) {
//     const indexKey = mapping[data.key];
//     if (indexKey !== undefined && indexKey !== null) {
//       let indexValue = indexDoc[indexKey];

//       // Check if we have a value for this index key. This can happen e.g. authors
//       // where the metadata has multiple entries for the same metadata key.
//       // If we have multiple entries for the same key, index them as an array.
//       if (indexValue !== undefined) {
//         // We already have a value for this metadata key. Either add it to an existing
//         // array of values or convert this index value into an array of metadata values.
//         if (Array.isArray(indexValue)) {
//           indexValue.push(data.value);
//         } else {
//           indexValue = [indexValue, data.value];
//         }
//       } else {
//         indexValue = data.value;
//       }

//       indexDoc[indexKey] = indexValue;
//     }
//   }

//   return indexDoc;
// }
