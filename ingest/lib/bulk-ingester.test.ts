import nock from 'nock';
import cryptoRandomString from 'crypto-random-string';
import bulkIngester from './bulk-ingester';
import * as snsUtils from '../../lib/sns-utils';
import * as sqsUtils from '../../lib/sqs-utils';

const dspaceEndpoint = 'https://dspace.example.com';
const ingestTopicName = `topic-${cryptoRandomString({ length: 6 })}`;
let ingestTopicArn: string;

let testIngestTopicQueue: { arn: string, url: string };

describe('bulk-ingester', () => {
  let awsAccessKeyIdBefore: string | undefined;
  let awsSecretAccessKey: string | undefined;

  beforeAll(async () => {
    awsAccessKeyIdBefore = process.env['AWS_ACCESS_KEY_ID'];
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';

    awsSecretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    const testIngestTopicQueueName = `queue-${cryptoRandomString({ length: 6 })}`;
    testIngestTopicQueue = await sqsUtils.createSQSQueue(
      testIngestTopicQueueName
    );

    ingestTopicArn = await snsUtils.createSnsTopic(ingestTopicName);
    await snsUtils.subscribe({
      protocol: 'sqs',
      endpoint: testIngestTopicQueue.arn,
      topicArn: ingestTopicArn,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await sqsUtils.deleteSqsQueue(testIngestTopicQueue.url);
    await snsUtils.deleteSnsTopic(ingestTopicArn);

    nock.enableNetConnect();

    process.env['AWS_ACCESS_KEY_ID'] = awsAccessKeyIdBefore;
    process.env['AWS_SECRET_ACCESS_KEY'] = awsSecretAccessKey;
  });

  test('should queue all DSpace items for ingest', async () => {
    nock(dspaceEndpoint)
      .get('/rest/items')
      .query({
        limit: 50,
        offset: 0,
      })
      .reply(200, [
        {
          uuid: '1',
        },
        {
          uuid: '2',
        },
      ]);

    nock(dspaceEndpoint)
      .get('/rest/items')
      .query({
        limit: 50,
        offset: 2,
      })
      .reply(200, [
        {
          uuid: '3',
        },
      ]);

    nock(dspaceEndpoint)
      .get('/rest/items')
      .query({
        limit: 50,
        offset: 3,
      })
      .reply(200, []);

    const result = await bulkIngester(
      dspaceEndpoint,
      ingestTopicArn
    );

    expect(result).toEqual({
      success: {
        ids: ['1', '2', '3'],
        count: 3,
      },
      error: {
        ids: [],
        count: 0,
      },
      total: 3,
    });

    const [message1, message2, message3] = await sqsUtils.waitForMessages(
      testIngestTopicQueue.url,
      3
    );

    if (!message1 || !message2 || !message3) {
      fail('Expected 3 messages but got less than that');
    }

    const messageBody1 = JSON.parse(message1.Body || '{}');
    expect(messageBody1.Message).toEqual('1');

    const messageBody2 = JSON.parse(message2.Body || '{}');
    expect(messageBody2.Message).toEqual('2');

    const messageBody3 = JSON.parse(message3.Body || '{}');
    expect(messageBody3.Message).toEqual('3');
  });

  test('should return a list of items that failed to queue', async () => {
    nock(dspaceEndpoint)
      .get('/rest/items')
      .query({
        limit: 50,
        offset: 0,
      })
      .reply(200, [
        {
          uuid: '1',
        },
      ]);

    nock(dspaceEndpoint)
      .get('/rest/items')
      .query({
        limit: 50,
        offset: 1,
      })
      .reply(200, []);

    const result = await bulkIngester(
      dspaceEndpoint,
      'INVALID_ARN'
    );

    expect(result).toEqual({
      success: {
        ids: [],
        count: 0,
      },
      error: {
        ids: ['1'],
        count: 1,
      },
      total: 1,
    });
  });
});
