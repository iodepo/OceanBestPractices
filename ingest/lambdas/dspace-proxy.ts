import { z } from 'zod';
import * as dspaceClient from '../../lib/dspace-client';
import { getStringFromEnv } from '../../lib/env-utils';

const lambdaInvokeSchema = z.object({
  uuid: z.string().uuid(),
});

export const handler = async (event: unknown) => {
  const lambdaInvokeEvent = lambdaInvokeSchema.parse(event);
  const { uuid } = lambdaInvokeEvent;
  const dspaceEndpoint = getStringFromEnv('DSPACE_ENDPOINT');

  console.log(`INFO: Getting DSpace (${dspaceEndpoint}) item with UUID: ${uuid}`);

  const dspaceItem = await dspaceClient.getItem(
    dspaceEndpoint,
    uuid
  );

  console.log(`INFO: Got item ${JSON.stringify(dspaceItem)} with UUID: ${uuid}`);

  return dspaceItem;
};
