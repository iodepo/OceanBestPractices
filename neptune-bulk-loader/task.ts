import pino from 'pino';
import { z } from 'zod';
import { S3 } from 'aws-sdk';
import { getJsonFromS3, s3ObjectLocationFromS3Url } from './s3-utils';
import {
  BulkLoaderDataFormatSchema,
  NeptuneBulkLoaderClient,
} from './neptune-bulk-loader-client';
import { getBoolFromEnv, getStringFromEnv } from './env-utils';

const MetadataSchema = z.object({
  source: z.string().url(),
  format: BulkLoaderDataFormatSchema,
  namedGraphUri: z.string().url(),
});

type MainResult = Error | undefined;

const neptuneBulkLoader = async (): Promise<MainResult> => {
  const iamRoleArn = getStringFromEnv('IAM_ROLE_ARN');
  const insecureHttps = getBoolFromEnv('INSECURE_HTTPS', false);
  const neptuneUrl = getStringFromEnv('NEPTUNE_URL');
  const region = getStringFromEnv('AWS_REGION');

  const s3 = new S3();

  const logger = pino({ level: 'debug' });

  const bulkLoaderClient = new NeptuneBulkLoaderClient({
    neptuneUrl,
    iamRoleArn,
    region,
    insecureHttps,
    logger,
  });

  const metadataUrl = getStringFromEnv('S3_TRIGGER_OBJECT');

  logger.info(`Metadata URL: ${metadataUrl}`);

  const metadataLocation = s3ObjectLocationFromS3Url(metadataUrl);

  const rawMetadata = await getJsonFromS3(metadataLocation, s3);

  const metadata = MetadataSchema.parse(rawMetadata);

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

neptuneBulkLoader()
  .then((r) => console.log('Result:', r))
  .catch((error) => console.log('Error:', error));
