import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';
import * as snsUtils from '../../lib/sns-utils';
import * as sqsUtils from '../../lib/sqs-utils';
import { queueIngestDocument } from './ingest-queue';

const ingestTopicName = 'IngestTopicName';
let ingestTopicArn: string;

let testIngestTopicQueue: { arn: string, url: string };

describe('ingest-queue', () => {
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

  describe('queueIngestDocument', () => {
    test('should publish an SNS message to the available topic', async () => {
      await queueIngestDocument(
        'def456',
        ingestTopicArn
      );

      const [message] = await sqsUtils.waitForMessages(
        testIngestTopicQueue.url,
        1
      );

      if (!message) {
        fail('Expected one message but received none');
      }

      const bodyObject = JSON.parse(message.Body || '{}');
      expect(bodyObject.Message).toEqual('def456');
    });
  });
});
