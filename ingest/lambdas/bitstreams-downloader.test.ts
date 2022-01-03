import { randomUUID } from 'crypto';
import nock from 'nock';
import { values } from 'lodash';
import { main, MainContext } from './bitstreams-downloader';
import * as s3Utils from '../../lib/s3-utils';
import * as sqsUtils from '../../lib/sqs-utils';
import { s3EventFactory } from '../../lib/test-utils';
import { randomId } from '../../lib/string-utils';
import { TextractorSuccessResponse } from '../../lib/pdf-parser';
import { LambdaClient, nullLambdaClient } from '../../lib/lambda-client';

const buckets = {
  bitstreams: randomId('bucket'),
  dspaceItems: randomId('bucket'),
  textractorTemp: randomId('bucket'),
};

const fakeTextractorSuccessResponse: TextractorSuccessResponse = {
  text_uri: 's3://some-bucket/txt/some-uuid.txt',
  results: {
    textractor: {
      success: true,
    },
  },
};

const fakeInvokeSuccessLambda: LambdaClient = {
  ...nullLambdaClient,
  invoke: () => Promise.resolve(JSON.stringify(fakeTextractorSuccessResponse)),
};

describe('bitstreams-downloader.main', () => {
  let indexerQueue: { arn: string, url: string };
  let config: MainContext['config'];

  beforeAll(async () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await Promise.all(values(buckets).map((b) => s3Utils.createBucket(b)));
  });

  beforeEach(async () => {
    nock.cleanAll();

    indexerQueue = await sqsUtils.createSQSQueue(randomId('queue'));

    config = {
      documentsBucket: buckets.bitstreams,
      dspaceUrl: 'https://dspace.local',
      indexerQueueUrl: indexerQueue.url,
      textractorFunction: 'SET-ME',
      textractorTempBucket: buckets.textractorTemp,
    };
  });

  afterEach(async () => {
    await sqsUtils.deleteSqsQueue(indexerQueue.url);
  });

  afterAll(async () => {
    await Promise.all(
      values(buckets).map((b) => s3Utils.deleteBucket(b, true))
    );

    nock.enableNetConnect();
  });

  it('copies the PDF from dspace to S3', async () => {
    const uuid = randomUUID();

    nock('https://dspace.local')
      .get('/rest/abc/bitstreams/pdf')
      .reply(200, 'Mock bitstream.');

    await s3Utils.putJson(
      new s3Utils.S3ObjectLocation(buckets.dspaceItems, `${uuid}.json`),
      {
        uuid,
        handle: 'handle/abc',
        lastModified: '2021-11-15 11:30:57.109',
        metadata: [],
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            mimeType: 'application/pdf',
            retrieveLink: '/rest/abc/bitstreams/pdf',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      }
    );

    const event = s3EventFactory(buckets.dspaceItems, `${uuid}.json`);

    const context = {
      config,
      lambda: fakeInvokeSuccessLambda,
    };

    await main(event, context);

    const pdfObjectBody = await s3Utils.getObjectText(
      new s3Utils.S3ObjectLocation(buckets.bitstreams, `pdf/${uuid}.pdf`)
    );

    expect(pdfObjectBody).toEqual('Mock bitstream.');
  });

  it('writes to the indexer queue if there is a bitstream PDF', async () => {
    const uuid = randomUUID();

    nock('https://dspace.local')
      .get('/rest/abc/bitstreams/pdf')
      .reply(200, 'Mock bitstream.');

    await s3Utils.putJson(
      new s3Utils.S3ObjectLocation(buckets.dspaceItems, `${uuid}.json`),
      {
        uuid,
        handle: 'handle/abc',
        lastModified: '2021-11-15 11:30:57.109',
        metadata: [],
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            mimeType: 'application/pdf',
            retrieveLink: '/rest/abc/bitstreams/pdf',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      }
    );

    const event = s3EventFactory(buckets.dspaceItems, `${uuid}.json`);

    const context = {
      config,
      lambda: fakeInvokeSuccessLambda,
    };

    await main(event, context);

    const [message] = await sqsUtils.waitForMessages(indexerQueue.url, 1);

    const body = JSON.parse(message?.Body || '{}');

    expect(body).toEqual({
      uuid,
      bitstreamTextBucket: config.documentsBucket,
      bitstreamTextKey: `txt/${uuid}.txt`,
    });
  });

  it('writes to the indexer queue if there is no bitstream PDF', async () => {
    const uuid = randomUUID();

    await s3Utils.putJson(
      new s3Utils.S3ObjectLocation(buckets.dspaceItems, `${uuid}.json`),
      {
        uuid,
        handle: 'handle/abc',
        lastModified: '2021-11-15 11:30:57.109',
        metadata: [],
        bitstreams: [],
      }
    );

    const event = s3EventFactory(buckets.dspaceItems, `${uuid}.json`);

    const context = {
      config,
      lambda: nullLambdaClient,
    };

    await main(event, context);

    const [message] = await sqsUtils.waitForMessages(indexerQueue.url, 1);

    const body = JSON.parse(message?.Body || '{}');
    expect(body).toEqual({
      uuid,
    });
  });
});
