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
    const mockItem = {
      uuid: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
      handle: 'abc/123',
      bitstreams: [],
      metadata: [],
      lastModified: '2021-11-15 11:30:57.109',
    };

    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .query({
        expand: 'bitstreams,metadata',
      })
      .reply(200, mockItem);

    const mockEvent = {
      Records: [
        {
          Sns: {
            Message: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
          },
        },
      ],
    };
    await handler(mockEvent);

    // Check that the object was uploaded to S3.
    const s3Location = new s3Utils.S3ObjectLocation(
      dspaceItemBucket,
      '38c7d808-aa26-4ed4-a3e4-3458b989d2d4.json'
    );
    const result = await s3Utils.getObjectJson(s3Location);
    expect(result).toEqual(mockItem);
  });

  test('should throw an error when the a DSpace item with UUID from SNS is not found', async () => {
    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .query({
        expand: 'bitstreams,metadata',
      })
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
    // Uploading to a non-existent bucket will throw an error.
    process.env['DOCUMENT_METADATA_BUCKET'] = 'invalid-bucket';

    nock('https://dspace.test.com')
      .get('/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4')
      .query({
        expand: 'bitstreams,metadata',
      })
      .reply(200, {
        uuid: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
        handle: 'abc/123',
        bitstreams: [],
        metadata: [],
        lastModified: '2021-11-15 11:30:57.109',
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
      .toThrow('The specified bucket does not exist');
  });
});
