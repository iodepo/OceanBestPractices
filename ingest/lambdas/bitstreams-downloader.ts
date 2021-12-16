import { z } from 'zod';
import pMap from 'p-map';
import got from 'got/dist/source';
import {
  S3ObjectLocation,
  safeGetObjectJson,
  uploadStream,
} from '../../lib/s3-utils';
import { dspaceItemSchema } from '../../lib/dspace-schemas';
import { getStringFromEnv } from '../../lib/env-utils';
import { findPDFBitstreamItem } from '../../lib/dspace-item';
import { sendMessage } from '../../lib/sqs-utils';

const s3EventSchema = z.object({
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

export const handler = async (event: unknown) => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const bitstreamSourceBucket = getStringFromEnv('DOCUMENT_BINARY_BUCKET');
  const indexerQueueUrl = getStringFromEnv('INDEXER_QUEUE_URL');

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
          console.log(`INFO: DSpace item ${dspaceItem.uuid} has no PDF. Skipping upload and queuing it for indexing.`);

          // Write to SQS.
          await sendMessage(
            indexerQueueUrl,
            JSON.stringify({ uuid: dspaceItem.uuid })
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
