const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

const s3Client = require('./s3-client');

const mockS3 = mockClient(S3Client);

describe('s3-client', () => {
  describe('getJSONObject', () => {
    test('should return a JSON file from S3 as a JSON object', async () => {
      const mockJSONObject = { mock: 'object' };
      const mockJSONObjectAsString = JSON.stringify(mockJSONObject);

      mockS3.on(
        GetObjectCommand
      )
        .resolves({
          Body: Readable.from(Buffer.from(mockJSONObjectAsString)),
        });

      const result = await s3Client.getJSONObject(
        'mockBucket',
        'mockKey'
      );

      expect(result).toEqual(mockJSONObject);

      const getObjectCommandCalls = mockS3.commandCalls(
        GetObjectCommand,
        {
          Bucket: 'mockBucket',
          Key: 'mockKey',
        }
      );
      expect(getObjectCommandCalls.length).toEqual(1);
    });
  });

  describe('putObject', () => {
    test('should put an object in S3', async () => {
      mockS3.on(
        PutObjectCommand
      ).resolves();

      const mockPayload = Buffer.from('Mock payload.');
      await s3Client.pubObject(
        'mockBucket',
        'mockKey',
        mockPayload
      );

      const putObjectCommandCalls = mockS3.commandCalls(
        PutObjectCommand,
        {
          Bucket: 'mockBucket',
          Key: 'mockKey',
          Body: mockPayload,
        }
      );

      expect(putObjectCommandCalls.length).toEqual(1);
    });
  });
});
