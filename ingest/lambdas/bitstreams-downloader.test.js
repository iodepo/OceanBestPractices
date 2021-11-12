const bitstreamsDownloader = require('./bitstreams-downloader');
const dspaceClient = require('../../lib/dspace-client');
const lambdaClient = require('../../lib/lambda-client');
const s3Client = require('../../lib/s3-client');

describe('bitstreams-downloader', () => {
  test('should upload the PDF bitstream from a DSpace item to S3', async () => {
    s3Client.getJSONObject = jest.fn().mockImplementationOnce(() => ({
      uuid: 'abc',
      bitstreams: [
        {
          bundleName: 'ORIGINAL',
          mimeType: 'application/pdf',
          retrieveLink: '/rest/abc/bitstreams/pdf',
        },
        {
          bundleName: 'ORIGINAL',
          mimeType: 'image/jpg',
          retrieveLink: '/rest/abc/bitstreams/jpg',
        },
      ],
    }));

    s3Client.pubObject = jest.fn();

    dspaceClient.getBitstream = jest.fn().mockImplementationOnce(() => (
      Buffer.from('Mock bitstream.')
    ));

    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: {
              name: 'mock-bucket',
            },
            object: {
              key: 'mock-key',
            },
          },
        },
      ],
    };

    await bitstreamsDownloader(mockEvent);

    expect(s3Client.getJSONObject).toHaveBeenCalledTimes(1);
    expect(s3Client.getJSONObject).toHaveBeenCalledWith('mock-bucket', 'mock-key', 'us-east-1');

    expect(s3Client.pubObject).toHaveBeenCalledTimes(1);
    expect(s3Client.pubObject).toHaveBeenCalledWith(
      'obp-test-document-binary-bucket',
      'abc.pdf',
      Buffer.from('Mock bitstream.')
    );

    expect(dspaceClient.getBitstream).toHaveBeenCalledTimes(1);
    expect(dspaceClient.getBitstream).toHaveBeenCalledWith(
      'https://dspace.test.com',
      '/rest/abc/bitstreams/pdf'
    );
  });

  test('should directly invoke indexer function if there is no bitstream PDF', async () => {
    s3Client.getJSONObject = jest.fn().mockImplementationOnce(() => ({
      uuid: 'abc',
      bitstreams: [
        {
          bundleName: 'ORIGINAL',
          mimeType: 'image/jpg',
          retrieveLink: '/rest/abc/bitstreams/jpg1',
        },
        {
          bundleName: 'ORIGINAL',
          mimeType: 'image/jpg',
          retrieveLink: '/rest/abc/bitstreams/jpg2',
        },
      ],
    }));

    lambdaClient.invoke = jest.fn();

    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: {
              name: 'mock-bucket',
            },
            object: {
              key: 'mock-key',
            },
          },
        },
      ],
    };

    await bitstreamsDownloader(mockEvent);

    expect(s3Client.getJSONObject).toHaveBeenCalledTimes(1);
    expect(s3Client.getJSONObject).toHaveBeenCalledWith('mock-bucket', 'mock-key', 'us-east-1');

    expect(lambdaClient.invoke).toHaveBeenCalledTimes(1);
    expect(lambdaClient.invoke).toHaveBeenCalledWith(
      'obp-test-indexer-function',
      'Event',
      { uuid: 'abc' }
    );
  });
});
