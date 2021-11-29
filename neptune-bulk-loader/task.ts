import pino from 'pino';
import { z } from 'zod';
import * as s3Utils from '../lib/s3-utils';
import {
  BulkLoaderDataFormatSchema,
  NeptuneBulkLoaderClient,
} from './neptune-bulk-loader-client';
import { getBoolFromEnv, getStringFromEnv } from '../lib/env-utils';

const metadataSchema = z.object({
  source: z.string().url(),
  format: BulkLoaderDataFormatSchema,
  namedGraphUri: z.string().url(),
});

type MainResult = Error | undefined;

export const neptuneBulkLoader = async (): Promise<MainResult> => {
  const iamRoleArn = getStringFromEnv('IAM_ROLE_ARN');
  const insecureHttps = getBoolFromEnv('INSECURE_HTTPS', false);
  const metadataUrl = getStringFromEnv('S3_TRIGGER_OBJECT');
  const neptuneUrl = getStringFromEnv('NEPTUNE_URL');
  const region = getStringFromEnv('AWS_REGION');

  const logger = pino({ level: 'debug' });

  const bulkLoaderClient = new NeptuneBulkLoaderClient({
    neptuneUrl,
    iamRoleArn,
    region,
    insecureHttps,
    logger,
  });

  logger.info(`Metadata URL: ${metadataUrl}`);

  const metadataLocation = s3Utils.S3ObjectLocation.fromS3Url(metadataUrl);

  const rawMetadata = await s3Utils.getObjectJson(metadataLocation);

  const metadata = metadataSchema.parse(rawMetadata);

  logger.info({ metadata }, 'Metadata');

  const loadId = await bulkLoaderClient.load({
    source: metadata.source,
    format: metadata.format,
    namedGraphUri: metadata.namedGraphUri,
  });

  logger.info(`loadId: ${loadId}`);

  await bulkLoaderClient.waitForLoadCompleted(loadId);

  return undefined;
};

if (require.main === module) {
  neptuneBulkLoader()
    .then((r) => console.log('Result:', r))
    .catch((error) => console.log('Error:', error));
}
