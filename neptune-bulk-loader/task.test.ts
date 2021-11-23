import nock from 'nock';
import S3 from 'aws-sdk/clients/s3';
import { neptuneBulkLoader } from './task';

jest.mock('aws-sdk/clients/s3');

const S3Mock = S3 as jest.MockedClass<typeof S3>;

S3Mock.prototype.getObject = jest.fn();

describe('task-launcher.handler()', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    process.env['IAM_ROLE_ARN'] = 'iam-role-arn';
    process.env['S3_TRIGGER_OBJECT'] = 's3://my-bucket/my-metadata-key';
    process.env['NEPTUNE_URL'] = 'https://neptune.local:8182';
    process.env['AWS_REGION'] = 'us-east-1';

    S3Mock.prototype.getObject.mockClear();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  const requiredEnvVars = [
    'IAM_ROLE_ARN',
    'S3_TRIGGER_OBJECT',
    'NEPTUNE_URL',
    'AWS_REGION',
  ];
  for (const k of requiredEnvVars) {
    it(`throws an error if ${k} is not set`, async () => {
      delete process.env[k];

      await expect(neptuneBulkLoader()).rejects.toThrow();
    });
  }

  it('sends the correct loader request to the Neptune bulk loader', async () => {
    S3Mock.prototype.getObject = jest.fn().mockReturnValue({
      promise: () => Promise.resolve({
        Body: Buffer.from(JSON.stringify({
          source: 's3://my-bucket/my-source-key',
          format: 'csv',
          namedGraphUri: 'https://graph.local',
        })),
      }),
    });

    const loaderScope = nock('https://neptune.local:8182')
      .post('/loader')
      .reply(200, {
        status: '200 OK',
        payload: {
          loadId: 'load-id-1',
        },
      })
      .get('/loader')
      .query({ loadId: 'load-id-1' })
      .reply(200, {
        status: '200 OK',
        payload: {
          overallStatus: {
            status: 'LOAD_IN_PROGRESS',
          },
        },
      })
      .get('/loader')
      .query({ loadId: 'load-id-1' })
      .reply(200, {
        status: '200 OK',
        payload: {
          overallStatus: {
            status: 'LOAD_COMPLETED',
          },
        },
      });

    await neptuneBulkLoader();

    expect(loaderScope.isDone()).toBe(true);
  });
});
