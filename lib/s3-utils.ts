import { z } from 'zod';
import type S3 from 'aws-sdk/clients/s3';
import pMap from 'p-map';
import { s3 } from './aws-clients';

export const s3ObjectUrlRegex = new RegExp('^s3://([^/]+)/(.*[^/])$');

export class S3ObjectLocation {
  public readonly bucket: string;

  public readonly key: string;

  constructor(bucket: string, key: string) {
    this.bucket = bucket;
    this.key = key;
  }

  public get url() {
    return `s3://${this.bucket}/${this.key}`;
  }

  public get apiParams() {
    return {
      Bucket: this.bucket,
      Key: this.key,
    };
  }

  static fromS3Url(url: string) {
    const match = s3ObjectUrlRegex.exec(url);

    if (match === null) throw new TypeError(`Invalid S3 Object URL: ${url}`);

    return new S3ObjectLocation(match[1] as string, match[2] as string);
  }
}

export interface GetBodyFromS3Client {
  getObject(params: Pick<S3.GetObjectRequest, 'Bucket' | 'Key'>): {
    promise(): Promise<Pick<S3.GetObjectOutput, 'Body'>>
  }
}

const getObjectBody = async (
  s3Location: S3ObjectLocation
): Promise<S3.Body> => {
  try {
    const result = await s3().getObject({
      Bucket: s3Location.bucket,
      Key: s3Location.key,
    }).promise();

    if (result.Body === undefined) {
      throw new Error(`Body of ${s3Location.url} is undefined`);
    }

    return result.Body;
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Failed to fetch ${s3Location.url}: ${error.message}`);
    }
    throw error;
  }
};

export const getObjectText = (s3Location: S3ObjectLocation): Promise<string> =>
  getObjectBody(s3Location).then((b) => b.toString());

export const getObjectJson = (s3Location: S3ObjectLocation): Promise<unknown> =>
  getObjectText(s3Location).then(JSON.parse);

export const safeGetObjectJson = async <T extends z.ZodTypeAny>(
  s3Location: S3ObjectLocation,
  schema: T
): Promise<z.infer<typeof schema>> => {
  const obj = await getObjectJson(s3Location);
  return schema.parse(obj);
};

export const createBucket = async (bucket: string): Promise<void> => {
  await s3().createBucket({ Bucket: bucket }).promise();
};

export const listBucket = async (bucket: string): Promise<string[]> => {
  const response = await s3().listObjectsV2({ Bucket: bucket }).promise();

  return (response.Contents || [])
    .map((c) => c.Key)
    .filter((k): k is string => typeof k === 'string');
};

export const deleteObject = async (
  s3Location: S3ObjectLocation
): Promise<void> => {
  await s3().deleteObject(s3Location.apiParams).promise();
};

export const emptyBucket = async (bucket: string): Promise<void> => {
  const keys = await listBucket(bucket);

  const locations = keys.map((key) => (new S3ObjectLocation(bucket, key)));

  await pMap(locations, deleteObject, { concurrency: 5 });
};

export const deleteBucket = async (
  bucket: string,
  force = false
): Promise<void> => {
  if (force) await emptyBucket(bucket);
  await s3().deleteBucket({ Bucket: bucket }).promise();
};

export const putText = async (
  s3Location: S3ObjectLocation,
  body: string
): Promise<void> => {
  await s3().putObject({
    Bucket: s3Location.bucket,
    Key: s3Location.key,
    Body: body,
  }).promise();
};

export const putJson = async (
  s3Location: S3ObjectLocation,
  body: unknown
): Promise<void> => {
  await s3().putObject({
    Bucket: s3Location.bucket,
    Key: s3Location.key,
    Body: JSON.stringify(body),
  }).promise();
};
