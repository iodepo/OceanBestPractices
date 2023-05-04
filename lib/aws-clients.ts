import { S3, SNS, SQS } from 'aws-sdk';
import { URL } from 'url';
import { getStringFromEnv } from './env-utils';

const localStackEndpointEnvVar = 'LOCAL_STACK_ENDPOINT';

const localStackEndpoint = (): string =>
  getStringFromEnv(localStackEndpointEnvVar, true)
    || 'http://localhost:4566';

export const localStackParams = () => ({
  credentials: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
  },
  endpoint: localStackEndpoint(),
  region: 'us-east-1',
});

const useLocalStack = (): boolean => {
  if (getStringFromEnv(localStackEndpointEnvVar, true)) return true;
  return process.env['NODE_ENV'] === 'test';
};

export const s3 = (options?: S3.Types.ClientConfiguration): S3 => {
  const localStackOverrides = {
    ...localStackParams(),
    s3ForcePathStyle: true,
  };

  const useLocalStackCached = useLocalStack();

  const overrides = useLocalStackCached ? localStackOverrides : {};
  const s3Client = new S3({
    ...overrides,
    ...options,
  });

  if (useLocalStackCached) {
    // @ts-expect-error Error in AWS SDK/LocalStack in us-east-1 region https://github.com/localstack/localstack/issues/8000
    s3Client.api.globalEndpoint = new URL(localStackEndpoint()).hostname;
  }

  return s3Client;
};

export const sns = (options?: SNS.Types.ClientConfiguration): SNS => {
  const overrides = useLocalStack() ? localStackParams() : {};

  return new SNS({
    ...overrides,
    ...options,
  });
};

export const sqs = (options?: SQS.Types.ClientConfiguration): SQS => {
  const overrides = useLocalStack() ? localStackParams() : {};

  return new SQS({
    ...overrides,
    ...options,
  });
};
