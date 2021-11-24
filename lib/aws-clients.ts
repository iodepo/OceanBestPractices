import { S3 } from 'aws-sdk';
import { getStringFromEnv } from './env-utils';

const localStackEndpointEnvVar = 'LOCAL_STACK_ENDPOINT';

const localStackEndpoint = (): string =>
  getStringFromEnv(localStackEndpointEnvVar, true)
    || 'http://localhost:4566';

const defaultLocalstackOverrides = (): S3.Types.ClientConfiguration => ({
  credentials: {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
  },
  endpoint: localStackEndpoint(),
});

const useLocalStack = (): boolean => {
  if (getStringFromEnv(localStackEndpointEnvVar, true)) return true;
  return process.env['NODE_ENV'] === 'test';
};

export const s3 = (options?: S3.Types.ClientConfiguration): S3 => {
  const localStackOverrides = {
    ...defaultLocalstackOverrides(),
    s3ForcePathStyle: true,
  };

  const overrides = useLocalStack() ? localStackOverrides : {};

  return new S3({
    ...overrides,
    ...options,
  });
};
