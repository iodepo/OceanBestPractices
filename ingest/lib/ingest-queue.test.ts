import { mockClient } from 'aws-sdk-client-mock';
import {
  PublishCommand,
  SNSClient,
} from '@aws-sdk/client-sns';
import { queueIngestDocument } from './ingest-queue';

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

      const result = await queueIngestDocument(
        'def456',
        'arn:example:123'
      );

      expect(result).toEqual(mockPublishCommandOutput);
    });
  });
});
