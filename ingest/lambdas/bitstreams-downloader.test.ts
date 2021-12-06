import cryptoRandomString from 'crypto-random-string';
import { handler } from './bitstreams-downloader';

import * as dspaceClient from '../../lib/dspace-client';
import * as s3Utils from '../../lib/s3-utils';
// @ts-expect-error Import will be fixed when file is converted to Typescript.
import lambdaClient from '../../lib/lambda-client';

const dspaceItemBucket = `bucket-${cryptoRandomString({ length: 6 })}`;
const bitstreamSourceBucket = `bucket-${cryptoRandomString({ length: 6 })}`;

jest.mock('../../lib/dspace-client', () => ({
  getBitstream: jest.fn(),
}));

describe('bitstreams-downloader.handler', () => {
  beforeAll(async () => {
    await s3Utils.createBucket(dspaceItemBucket);
    await s3Utils.createBucket(bitstreamSourceBucket);
  });

  beforeEach(() => {
    process.env['DSPACE_ENDPOINT'] = 'https://dspace.test.com';
    process.env['DOCUMENT_BINARY_BUCKET'] = bitstreamSourceBucket;
    process.env['INDEXER_FUNCTION_NAME'] = 'obp-test-indexer-function';
  });

  afterAll(async () => {
    await s3Utils.deleteBucket(dspaceItemBucket, true);
    await s3Utils.deleteBucket(bitstreamSourceBucket, true);
  });

  test('should upload the PDF bitstream from a DSpace item to S3', async () => {
    await s3Utils.putJson(
      new s3Utils.S3ObjectLocation(
        dspaceItemBucket,
        '5a45f655-2dfe-4032-b39d-92efbe3f0ff8.json'
      ),
      {
        uuid: '5a45f655-2dfe-4032-b39d-92efbe3f0ff8',
        handle: 'handle/abc',
        lastModified: '2021-11-15 11:30:57.109',
        metadata: [],
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            mimeType: 'application/pdf',
            retrieveLink: '/rest/abc/bitstreams/pdf',
            checkSum: {
              value: 'abc',
            },
          },
          {
            bundleName: 'ORIGINAL',
            mimeType: 'image/jpg',
            retrieveLink: '/rest/abc/bitstreams/jpg',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      }
    );

    (dspaceClient.getBitstream as jest.Mock).mockImplementationOnce(() => (
      Buffer.from('Mock bitstream.')
    ));

    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: {
              name: dspaceItemBucket,
            },
            object: {
              key: '5a45f655-2dfe-4032-b39d-92efbe3f0ff8.json',
            },
          },
        },
      ],
    };

    await handler(mockEvent);

    const result = await s3Utils.getObjectText(
      new s3Utils.S3ObjectLocation(
        bitstreamSourceBucket,
        '5a45f655-2dfe-4032-b39d-92efbe3f0ff8.pdf'
      )
    );

    expect(result).toEqual('Mock bitstream.');
  });

  test('should directly invoke indexer function if there is no bitstream PDF', async () => {
    await s3Utils.putJson(
      new s3Utils.S3ObjectLocation(
        dspaceItemBucket,
        '5a45f655-2dfe-4032-b39d-92efbe3f0ff8.json'
      ),
      {
        uuid: '5a45f655-2dfe-4032-b39d-92efbe3f0ff8',
        handle: 'handle/abc',
        lastModified: '2021-11-15 11:30:57.109',
        metadata: [],
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            mimeType: 'image/jpg',
            retrieveLink: '/rest/abc/bitstreams/jpg',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      }
    );

    lambdaClient.invoke = jest.fn();

    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: {
              name: dspaceItemBucket,
            },
            object: {
              key: '5a45f655-2dfe-4032-b39d-92efbe3f0ff8.json',
            },
          },
        },
      ],
    };

    await handler(mockEvent);

    expect(lambdaClient.invoke).toHaveBeenCalledTimes(1);
    expect(lambdaClient.invoke).toHaveBeenCalledWith(
      'obp-test-indexer-function',
      'Event',
      { uuid: '5a45f655-2dfe-4032-b39d-92efbe3f0ff8' }
    );
  });
});
