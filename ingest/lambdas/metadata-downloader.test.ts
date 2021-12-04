import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';

import { handler } from './metadata-downloader';
import * as s3Utils from '../../lib/s3-utils';

const dspaceItemBucket = `bucket-${cryptoRandomString({ length: 6 })}`;

describe('metadata-downloader.handler()', () => {
  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await s3Utils.createBucket(dspaceItemBucket);
  });

  beforeEach(() => {
    process.env['DSPACE_ENDPOINT'] = 'https://dspace.test.com';
    process.env['DOCUMENT_METADATA_BUCKET'] = dspaceItemBucket;
  });

  afterAll(async () => {
    await s3Utils.deleteBucket(dspaceItemBucket, true);

    nock.enableNetConnect();
  });

  test('should upload a DSpace item to S3 when a UUID is received from SNS', async () => {
    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .reply(200, {
        uuid: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
        handle: 'abc/123',
      });

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
          },
        },
      ],
    };
    const result = await handler(mockEvent);
    expect(result).toEqual('38c7d808-aa26-4ed4-a3e4-3458b989d2d4');
  });

  test('should throw an error when the a DSpace item with UUID from SNS is not found', async () => {
    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .reply(404);

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
          },
        },
      ],
    };
    await expect(
      handler(mockEvent)
    )
      .rejects
      .toThrow('Could not find DSpace item with UUID 38c7d808-aa26-4ed4-a3e4-3458b989d2d4');
  });

  test('should throw an error when the DSpace item fails to upload to S3', async () => {
    // I think because we're using spyOn here that we're actually calling
    // putJson but still returning an error. That's ok for a test.
    const mockPutJson = jest.spyOn(s3Utils, 'putJson');
    mockPutJson.mockRejectedValueOnce(new Error('Mock S3 failure.'));

    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .reply(200, {
        uuid: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
        handle: 'abc/123',
      });

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
          },
        },
      ],
    };
    await expect(
      handler(mockEvent)
    )
      .rejects
      .toThrow('Mock S3 failure.');
  });
});
