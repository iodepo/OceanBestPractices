const { mockClient } = require('aws-sdk-client-mock');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const utils = require('../utils');

const mockSNS = mockClient(SNSClient);

describe('utils', () => {
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
        'https://example.com/handle/123',
        'arn:example:123'
      );

      expect(result).toEqual(mockPublishCommandOutput);
    });
  });
});
