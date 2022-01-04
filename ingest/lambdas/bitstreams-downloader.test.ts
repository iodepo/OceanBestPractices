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
  let context: MainContext;
  let config: MainContext['config'];
  let event: unknown;
  let indexerQueue: { arn: string, url: string };
  let uuid: string;

  beforeAll(async () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await Promise.all(values(buckets).map((b) => s3Utils.createBucket(b)));
  });

  beforeEach(async () => {
    uuid = randomUUID();

    nock.cleanAll();

    indexerQueue = await sqsUtils.createSQSQueue(randomId('queue'));

    config = {
      documentsBucket: buckets.bitstreams,
      dspaceUrl: 'https://dspace.local',
      indexerQueueUrl: indexerQueue.url,
      textractorFunction: 'SET-ME',
      textractorTempBucket: buckets.textractorTemp,
    };

    event = s3EventFactory(buckets.dspaceItems, `${uuid}.json`);
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

  describe('with a PDF', () => {
    beforeEach(async () => {
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

      context = {
        config,
        lambda: fakeInvokeSuccessLambda,
      };
    });

    it('copies the PDF from dspace to S3', async () => {
      await main(event, context);

      const pdfObjectBody = await s3Utils.getObjectText(
        new s3Utils.S3ObjectLocation(buckets.bitstreams, `pdf/${uuid}.pdf`)
      );

      expect(pdfObjectBody).toEqual('Mock bitstream.');
    });

    it('invokes the textractor function', async () => {
      const mockInvoke = jest.fn(
        async (name, payload) => {
          expect(name).toBe(config.textractorFunction);

          if (payload === undefined) fail('payload is undefined');

          expect(JSON.parse(payload)).toEqual({
            document_uri: `s3://${config.documentsBucket}/pdf/${uuid}.pdf`,
            temp_uri_prefix: `s3://${config.textractorTempBucket}/`,
            text_uri: `s3://${config.documentsBucket}/txt/${uuid}.txt`,
          });

          return JSON.stringify(fakeTextractorSuccessResponse);
        }
      ) as jest.MockedFunction<LambdaClient['invoke']>;

      context.lambda = {
        ...nullLambdaClient,
        invoke: mockInvoke,
      };

      await main(event, context);

      expect(mockInvoke.mock.calls.length).toBe(1);
    });

    it('writes to the indexer queue', async () => {
      await main(event, context);

      const [message] = await sqsUtils.waitForMessages(indexerQueue.url, 1);

      const body = JSON.parse(message?.Body || '{}');

      expect(body).toEqual({
        uuid,
        bitstreamTextBucket: config.documentsBucket,
        bitstreamTextKey: `txt/${uuid}.txt`,
      });
    });
  });

  describe('without a PDF', () => {
    beforeEach(async () => {
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

      context = {
        config,
        lambda: nullLambdaClient,
      };
    });

    it('does not invoke the textractor function', async () => {
      const mockInvoke = jest.fn(
        async (_name, _payload) => JSON.stringify(fakeTextractorSuccessResponse)
      ) as jest.MockedFunction<LambdaClient['invoke']>;

      context.lambda = {
        ...nullLambdaClient,
        invoke: mockInvoke,
      };

      await main(event, context);

      expect(mockInvoke.mock.calls.length).toBe(0);
    });

    it('writes to the indexer queue', async () => {
      await main(event, context);

      const [message] = await sqsUtils.waitForMessages(indexerQueue.url, 1);

      const body = JSON.parse(message?.Body || '{}');

      expect(body).toEqual({ uuid });
    });
  });
});
