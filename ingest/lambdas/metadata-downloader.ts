import { z } from 'zod';

import * as dspaceClient from '../../lib/dspace-client';
import { getStringFromEnv } from '../../lib/env-utils';
import { putJson, S3ObjectLocation } from '../../lib/s3-utils';

const snsEventSchema = z.object({
  Records: z.array(
    z.object({
      Sns: z.object({
        Message: z.string().uuid(),
      }),
    })
  ).nonempty(),
});

export const handler = async (event: unknown) => {
  const snsEvent = snsEventSchema.parse(event);
  const uuid = snsEvent.Records[0].Sns.Message;

  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');
  const dspaceItemBucket = getStringFromEnv('DOCUMENT_METADATA_BUCKET');

  try {
    const dspaceItem = await dspaceClient.getItem(
      dspaceEndpoint,
      uuid
    );

    if (dspaceItem === undefined) {
      throw new Error(`Could not find DSpace item with UUID ${uuid}`);
    }

    await putJson(
      new S3ObjectLocation(dspaceItemBucket, `${dspaceItem.uuid}.json`),
      dspaceItem
    );

    console.log(`INFO: Successfully uploaded metadata for item: ${dspaceItem.uuid}`);
  } catch (error) {
    console.log(`ERROR: Failed to upload metadata with error: ${error}`);
    throw error;
  }
};
