import { z } from 'zod';
import { BulkLoaderDataFormatSchema } from './neptune-bulk-loader-client';
import {
  S3ObjectLocation,
  s3ObjectUrlRegex,
  safeGetObjectJson,
} from '../lib/s3-utils';

const s3ObjectUrlSchema = z
  .string()
  .regex(s3ObjectUrlRegex)
  .transform((v) => S3ObjectLocation.fromS3Url(v));

const metadataSchema = z.object({
  source: s3ObjectUrlSchema,
  format: BulkLoaderDataFormatSchema,
  ontologyGraphUrl: z.string().url(),
  ontologyNameSpace: z.string(),
  terminologyTitle: z.string(),
  queryS3Url: s3ObjectUrlSchema,
});

type Metadata = z.infer<typeof metadataSchema>;

export const loadMetadata = async (metadataUrl: string): Promise<Metadata> => {
  const metadataLocation = S3ObjectLocation.fromS3Url(metadataUrl);

  return safeGetObjectJson(metadataLocation, metadataSchema);
};
