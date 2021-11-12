const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const dspaceClient = require('../../lib/dspace-client');
const metadataDownloader = require('./metadata-downloader');

const mockS3 = mockClient(S3Client);

describe('metadata-downloader', () => {
  beforeEach(() => {
    mockS3.reset();
  });

  test('should upload a DSpace item to S3 when a UUID is received from SNS', async () => {
    const mockPutObjectCommandOutput = {
      $metadata: {
        httpStatusCode: 200,
      },
    };

    mockS3.on(
      PutObjectCommand
    )
      .resolves(mockPutObjectCommandOutput);

    dspaceClient.getItem = jest.fn().mockImplementationOnce(() => ({
      uuid: 'abc',
      handle: 'abc/123',
    }));

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: 'abc',
          },
        },
      ],
    };
    const result = await metadataDownloader(mockEvent);
    expect(result).toEqual('abc');

    // This allows us to make sure S3 was called with the correct
    // parameters.
    const putObjectCommandCalls = mockS3.commandCalls(PutObjectCommand, {
      Body: JSON.stringify({
        uuid: 'abc',
        handle: 'abc/123',
      }),
      Key: 'abc.json',
      Bucket: 'obp-test-document-metadata-bucket',
    });
    expect(putObjectCommandCalls.length).toEqual(1);

    expect(dspaceClient.getItem).toHaveBeenCalledTimes(1);
    expect(dspaceClient.getItem).toHaveBeenCalledWith(
      'https://dspace.test.com',
      'abc'
    );
  });

  test('should throw an error when the a DSpace item with UUID from SNS is not found', async () => {
    dspaceClient.getItem = jest.fn().mockImplementationOnce(() => undefined);

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: 'abc',
          },
        },
      ],
    };
    await expect(
      metadataDownloader(mockEvent)
    )
      .rejects
      .toThrow('Could not find DSpace item with UUID abc');
  });

  test('should throw an error when the DSpace item fails to upload to S3', async () => {
    mockS3.on(
      PutObjectCommand
    )
      .rejects('Mock S3 failure.');

    dspaceClient.getItem = jest.fn().mockImplementationOnce(() => ({
      uuid: 'abc',
      handle: 'abc/123',
    }));

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: 'abc',
          },
        },
      ],
    };
    await expect(
      metadataDownloader(mockEvent)
    )
      .rejects
      .toThrow('Mock S3 failure.');
  });
});
