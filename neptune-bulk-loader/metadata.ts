import { z } from 'zod';
import { BulkLoaderDataFormatSchema } from './neptune-bulk-loader-client';
import * as s3Utils from '../lib/s3-utils';

const metadataSchema = z.object({
  source: z.string().url(),
  format: BulkLoaderDataFormatSchema,
  ontologyGraphUrl: z.string().url(),
  ontologyNameSpace: z.string(),
});

type Metadata = z.infer<typeof metadataSchema>;

export const loadMetadata = async (metadataUrl: string): Promise<Metadata> => {
  const metadataLocation = s3Utils.S3ObjectLocation.fromS3Url(metadataUrl);

  return s3Utils.safeGetObjectJson(metadataLocation, metadataSchema);
};
