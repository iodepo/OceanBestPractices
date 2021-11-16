import type S3 from 'aws-sdk/clients/s3';

export interface S3ObjectLocation {
  readonly url: string,
  readonly bucket: string,
  readonly key: string
}

/**
 * Parse an `s3://bucket/key` URL into a `{ url, bucket, key }` object. In order
 * to reference an S3 object, the key may not end in a `/`.
 */
export function s3ObjectLocationFromS3Url(url: string): S3ObjectLocation {
  const s3UrlRegex = new RegExp('^s3://([^/]+)/(.*[^/])$');

  const match = s3UrlRegex.exec(url);

  if (match === null) throw new TypeError(`Invalid S3 Object URL: ${url}`);

  // If the regex passed then we know these are strings
  return {
    bucket: match[1] as string,
    key: match[2] as string,
    url,
  };
}

export interface GetBodyFromS3Client {
  getObject(params: Pick<S3.GetObjectRequest, 'Bucket' | 'Key'>): {
    promise(): Promise<Pick<S3.GetObjectOutput, 'Body'>>
  }
}

const getBodyFromS3 = async (
  s3Location: S3ObjectLocation,
  s3: GetBodyFromS3Client
): Promise<S3.Body> => {
  const result = await s3.getObject({
    Bucket: s3Location.bucket,
    Key: s3Location.key,
  }).promise();

  if (result.Body === undefined) {
    throw new Error(`Body of ${s3Location.url} is undefined`);
  }

  return result.Body;
};

const getTextFromS3 = (
  s3Location: S3ObjectLocation,
  s3: GetBodyFromS3Client
): Promise<string> => getBodyFromS3(s3Location, s3).then((b) => b.toString());

export const getJsonFromS3 = (
  s3Location: S3ObjectLocation,
  s3: GetBodyFromS3Client
): Promise<unknown> => getTextFromS3(s3Location, s3).then(JSON.parse);
