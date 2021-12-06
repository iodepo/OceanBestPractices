import { z } from 'zod';

import { s3 } from '../../lib/aws-clients';
import * as dspaceClient from '../../lib/dspace-client';
import { S3ObjectLocation, safeGetObjectJson } from '../../lib/s3-utils';
import lambdaClient from '../../lib/lambda-client';
import { dspaceItemSchema } from '../../lib/dspace-schemas';
import { getStringFromEnv } from '../../lib/env-utils';
import { findPDFBitstreamItem } from '../../lib/dspace-item';

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
  const s3Event = s3EventSchema.parse(event);

  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const bitstreamSourceBucket = getStringFromEnv('DOCUMENT_BINARY_BUCKET');
  const indexerFunction = getStringFromEnv('INDEXER_FUNCTION_NAME');

  try {
    // Get the DSpace item from S3.
    const s3Location = new S3ObjectLocation(
      s3Event.Records[0].s3.bucket.name,
      s3Event.Records[0].s3.object.key
    );

    const dspaceItem = await safeGetObjectJson(
      s3Location,
      dspaceItemSchema
    );

    // Get the PDF bitstream metadata.
    const pdfBitstreamItem = findPDFBitstreamItem(dspaceItem.bitstreams);
    if (pdfBitstreamItem !== undefined) {
      console.log(`INFO: Found PDF for DSpace item ${dspaceItem.uuid}. Uploading to S3.`);

      // Get the PDF from DSpace.
      const pdfBuffer = await dspaceClient.getBitstream(
        dspaceEndpoint,
        pdfBitstreamItem.retrieveLink
      );

      // Upload the PDF to S3.
      await s3().putObject({
        Bucket: bitstreamSourceBucket,
        Key: `${dspaceItem.uuid}.pdf`,
        Body: pdfBuffer,
      }).promise();

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
};
