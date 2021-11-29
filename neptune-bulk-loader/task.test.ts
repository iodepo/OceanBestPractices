import nock from 'nock';
import cryptoRandomString from 'crypto-random-string';
import { neptuneBulkLoader } from './task';
import * as s3Utils from '../lib/s3-utils';

const bulkLoaderBucket = `bucket-${cryptoRandomString({ length: 6 })}`;

describe('task-launcher.handler()', () => {
  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await s3Utils.createBucket(bulkLoaderBucket);
  });

  beforeEach(() => {
    process.env['IAM_ROLE_ARN'] = 'iam-role-arn';
    process.env['NEPTUNE_URL'] = 'https://neptune.local:8182';
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['ES_URL'] = 'http://localhost:9200';

    const termsIndex = `terms-index-${cryptoRandomString({ length: 6 })}`;
    process.env['ES_TERMS_INDEX'] = termsIndex;
  });

  afterAll(async () => {
    await s3Utils.deleteBucket(bulkLoaderBucket, true);

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
    const metadataLocation = new s3Utils.S3ObjectLocation(
      bulkLoaderBucket,
      `bulk-loader-trigger/${cryptoRandomString({ length: 10 })}.json`
    );

    await s3Utils.putJson(
      metadataLocation,
      {
        source: `s3://${bulkLoaderBucket}/my-source.xml`,
        format: 'csv',
        namedGraphUri: 'https://graph.local',
      }
    );

    process.env['S3_TRIGGER_OBJECT'] = metadataLocation.url;

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
