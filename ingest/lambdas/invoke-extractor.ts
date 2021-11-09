import { S3Event } from 'aws-lambda';
import { Lambda } from 'aws-sdk';

export async function handler(event: S3Event): Promise<void> {
  if (!process.env['TEXT_EXTRACTOR_FUNCTION_NAME']) {
    throw new Error('TEXT_EXTRACTOR_FUNCTION_NAME not set');
  }

  if (!process.env['TEXT_EXTRACTOR_TEMP_BUCKET']) {
    throw new Error('TEXT_EXTRACTOR_TEMP_BUCKET not set');
  }

  if (!process.env['TEXT_EXTRACTOR_BUCKET']) {
    throw new Error('TEXT_EXTRACTOR_BUCKET not set');
  }

  const textFunctionName = process.env['TEXT_EXTRACTOR_FUNCTION_NAME'];
  const textTempBucketName = process.env['TEXT_EXTRACTOR_TEMP_BUCKET'];
  const textBucketName = process.env['TEXT_EXTRACTOR_BUCKET'];

  const record = event.Records[0];
  if (record === undefined) return;

  const binaryBucket = record.s3.bucket.name;
  const binaryKey = record.s3.object.key;

  const textKey = `${binaryKey.split('.')[0]}.txt`;

  const payload = JSON.stringify({
    document_uri: `s3://${binaryBucket}/${binaryKey}`,
    temp_uri_prefix: `s3://${textTempBucketName}/`,
    text_uri: `s3://${textBucketName}/${textKey}`,
  });

  const lambda = new Lambda();

  await lambda.invoke({
    FunctionName: textFunctionName,
    InvocationType: 'Event',
    Payload: payload,
  }).promise();
}
