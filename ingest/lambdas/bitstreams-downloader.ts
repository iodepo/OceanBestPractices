import pMap from 'p-map';
import got from 'got/dist/source';
import {
  s3EventSchema,
  S3ObjectLocation,
  safeGetObjectJson,
  uploadStream,
} from '../../lib/s3-utils';
import { dspaceItemSchema } from '../../lib/dspace-schemas';
import { getStringFromEnv } from '../../lib/env-utils';
import { findPDFBitstreamItem } from '../../lib/dspace-item';
import { sendMessage } from '../../lib/sqs-utils';
import * as pdfParser from '../../lib/pdf-parser';

export const handler = async (event: unknown) => {
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const documentsBucket = getStringFromEnv('DOCUMENT_BINARY_BUCKET');
  const indexerQueueUrl = getStringFromEnv('INDEXER_QUEUE_URL');
  const textractorFunction = getStringFromEnv('TEXTRACTOR_FUNCTION');
  const textractorTempBucket = getStringFromEnv('TEXTRACTOR_TEMP_BUCKET');

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

        const { uuid, bitstreams } = await safeGetObjectJson(
          s3Location,
          dspaceItemSchema
        );

        // Get the PDF bitstream metadata.
        const pdfBitstreamItem = findPDFBitstreamItem(bitstreams);
        if (pdfBitstreamItem !== undefined) {
          console.log(`INFO: Found PDF for DSpace item ${uuid}. Uploading to S3.`);

          const pdfKey = `pdf/${uuid}.pdf`;

          await uploadStream(
            documentsBucket,
            pdfKey,
            got.stream(`${dspaceEndpoint}${pdfBitstreamItem.retrieveLink}`)
          );

          console.log(`INFO: Uploaded PDF for DSpace item ${uuid}`);

          const txtKey = `txt/${uuid}.txt`;

          await pdfParser.parseObject({
            source: `s3://${documentsBucket}/${pdfKey}`,
            destination: `s3://${documentsBucket}/${txtKey}`,
            tempBucket: textractorTempBucket,
            textractorFunction,
          });

          await sendMessage(
            indexerQueueUrl,
            JSON.stringify({
              uuid,
              bitstreamTextBucket: documentsBucket,
              bitstreamTextKey: txtKey,
            })
          );
        } else {
          // No PDF so just invoke the indexer.
          console.log(`INFO: DSpace item ${uuid} has no PDF. Skipping upload and queuing it for indexing.`);

          // Write to SQS.
          await sendMessage(
            indexerQueueUrl,
            JSON.stringify({ uuid })
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
