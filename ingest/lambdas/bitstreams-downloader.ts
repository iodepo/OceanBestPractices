import pMap from 'p-map';
import got from 'got/dist/source';
import {
  s3EventSchema,
  S3ObjectLocation,
  safeGetObjectJson,
  uploadStream,
} from '../../lib/s3-utils';
import * as lambdaClient from '../../lib/lambda-client';
import { dspaceItemSchema } from '../../lib/dspace-schemas';
import { getStringFromEnv } from '../../lib/env-utils';
import { findPDFBitstreamItem } from '../../lib/dspace-item';

export const handler = async (event: unknown) => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const bitstreamSourceBucket = getStringFromEnv('DOCUMENT_BINARY_BUCKET');
  const indexerFunction = getStringFromEnv('INDEXER_FUNCTION_NAME');

  const s3Event = s3EventSchema.parse(event);

  await pMap(
    s3Event.Records,
    async (record) => {
      try {
        // Get the DSpace item from S3.
        const s3Location = new S3ObjectLocation(
          record.s3.bucket.name,
          record.s3.object.key
        );

        const dspaceItem = await safeGetObjectJson(
          s3Location,
          dspaceItemSchema
        );

        // Get the PDF bitstream metadata.
        const pdfBitstreamItem = findPDFBitstreamItem(dspaceItem.bitstreams);
        if (pdfBitstreamItem !== undefined) {
          console.log(`INFO: Found PDF for DSpace item ${dspaceItem.uuid}. Uploading to S3.`);

          await uploadStream(
            bitstreamSourceBucket,
            `${dspaceItem.uuid}.pdf`,
            got.stream(`${dspaceEndpoint}${pdfBitstreamItem.retrieveLink}`)
          );

          console.log(`INFO: Uploaded PDF for DSpace item ${dspaceItem.uuid}`);
        } else {
          // No PDF so just invoke the indexer.
          console.log(`INFO: DSpace item ${dspaceItem.uuid} has no PDF. Skipping upload and invoking the indexer.`);

          await lambdaClient.invoke(
            indexerFunction,
            'Event',
            { uuid: dspaceItem.uuid }
          );
        }
      } catch (error) {
        console.log(`ERROR: Failed to process DSpace item bitstream with error: ${error}`);
        throw error;
      }
    },
    { concurrency: 1 }
  );
};
