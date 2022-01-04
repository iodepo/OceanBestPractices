import { z } from 'zod';
import pMap from 'p-map';
import got from 'got/dist/source';
import {
  s3EventSchema,
  S3ObjectLocation,
  safeGetObjectJson,
  uploadStream,
} from '../../lib/s3-utils';
import { dspaceItemSchema } from '../../lib/dspace-schemas';
import { findPDFBitstreamItem } from '../../lib/dspace-item';
import { sendMessage } from '../../lib/sqs-utils';
import * as pdfParser from '../../lib/pdf-parser';
import { awsLambdaClient, LambdaClient } from '../../lib/lambda-client';

export interface MainContext {
  config: {
    documentsBucket: string;
    dspaceUrl: string;
    indexerQueueUrl: string;
    textractorFunction: string;
    textractorTempBucket: string;
  },
  lambda: LambdaClient;
}

export const main = async (event: unknown, context: MainContext) => {
  const {
    config: {
      documentsBucket,
      dspaceUrl,
      indexerQueueUrl,
      textractorFunction,
      textractorTempBucket,
    },
    lambda,
  } = context;

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
            got.stream(`${dspaceUrl}${pdfBitstreamItem.retrieveLink}`)
          );

          console.log(`INFO: Uploaded PDF for DSpace item ${uuid}`);

          const txtKey = `txt/${uuid}.txt`;

          await pdfParser.parseObject({
            source: `s3://${documentsBucket}/${pdfKey}`,
            destination: `s3://${documentsBucket}/${txtKey}`,
            tempBucket: textractorTempBucket,
            textractorFunction,
            lambda,
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
          // No PDF
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

const loadConfigFromEnv = (env: NodeJS.ProcessEnv) =>
  z.object({
    documentsBucket: z.string().min(1),
    dspaceUrl: z.string().url(),
    indexerQueueUrl: z.string().url(),
    textractorFunction: z.string().min(1),
    textractorTempBucket: z.string().min(1),
  }).parse(env);

export const handler = async (event: unknown) => {
  const context: MainContext = {
    config: loadConfigFromEnv(process.env),
    lambda: awsLambdaClient(),
  };

  await main(event, context);
};
