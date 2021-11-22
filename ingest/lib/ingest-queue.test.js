// @ts-check
const { mockClient } = require('aws-sdk-client-mock');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const utils = require('./ingest-queue');

const mockSNS = mockClient(SNSClient);

describe('ingest-queue', () => {
  describe('queueAvailableDocument', () => {
    beforeEach(() => {
      mockSNS.reset();
    });

    test('should publish an SNS message to the available topic', async () => {
      const mockPublishCommandOutput = {
        MessageId: 'abc123',
        SequenceNumber: '456',
      };

      mockSNS.on(PublishCommand).resolves(mockPublishCommandOutput);

      const result = await utils.queueIngestDocument(
        'def456',
        'arn:example:123'
      );

      expect(result).toEqual(mockPublishCommandOutput);
    });
  });
});
