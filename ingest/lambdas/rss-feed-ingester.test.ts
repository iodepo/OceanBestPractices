/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as ingestQueue from '../lib/ingest-queue';
import * as s3Utils from '../../lib/s3-utils';
import * as dspaceFeedIngester from './rss-feed-ingester';
import * as dspaceClient from '../../lib/dspace-client';

const pubDateS3Location = new s3Utils.S3ObjectLocation(
  'pub-date-bucket',
  'pubDate.txt'
);

describe('rss-feed-ingester.handler', () => {
  beforeAll(async () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('Wed, 9 Nov 2021 18:00:30 GMT'));

    process.env['DSPACE_ENDPOINT'] = 'https://dspace.test.com';
    process.env['INGEST_TOPIC_ARN'] = 'arn:ingest:topic:arn';
    process.env['FEED_INGESTER_PUB_DATE_BUCKET'] = 'pub-date-bucket';

    await s3Utils.createBucket(pubDateS3Location.bucket);
  });

  afterAll(async () => {
    await s3Utils.deleteBucket(pubDateS3Location.bucket, true);

    jest.useRealTimers();
  });

  describe('when there is no known last published date', () => {
    test('should queue recently published documents for ingest', async () => {
      // @ts-ignore
      dspaceClient.getFeed = jest.fn().mockImplementationOnce(() => ({
        channel: [{
          pubDate: [{
            _: 'Wed, 10 Nov 2021 18:00:30 GMT',
          }],
          item: [{
            link: ['https://repository.oceanbestpractices.org/handle/11329/1774'],
            pubDate: ['Fri, 01 Jan 2021 00:00:00 GMT'],
          }, {
            link: ['https://repository.oceanbestpractices.org/handle/11329/1772'],
            pubDate: ['Mon, 01 Jan 2007 00:00:00 GMT'],
          }],
        }],
      }));

      // @ts-ignore
      dspaceClient.find = jest
        .fn()
        .mockImplementationOnce(() => ([
          {
            uuid: 'abc',
          },
        ]))
        .mockImplementationOnce(() => ([
          {
            uuid: 'def',
          },
        ]));

      // @ts-ignore
      ingestQueue.queueIngestDocument = jest.fn();

      await dspaceFeedIngester.handler();

      expect(dspaceClient.getFeed).toHaveBeenCalledTimes(1);
      expect(dspaceClient.getFeed).toHaveBeenCalledWith('https://dspace.test.com');

      expect(dspaceClient.find).toHaveBeenCalledTimes(2);
      expect(dspaceClient.find).toHaveBeenNthCalledWith(
        1,
        'https://dspace.test.com',
        'dc.identifier.uri',
        'https://repository.oceanbestpractices.org/handle/11329/1774'
      );
      expect(dspaceClient.find).toHaveBeenNthCalledWith(
        2,
        'https://dspace.test.com',
        'dc.identifier.uri',
        'https://repository.oceanbestpractices.org/handle/11329/1772'
      );

      expect(ingestQueue.queueIngestDocument).toHaveBeenCalledTimes(2);
      expect(ingestQueue.queueIngestDocument).toHaveBeenNthCalledWith(
        1,
        'abc',
        'arn:ingest:topic:arn'
      );
      expect(ingestQueue.queueIngestDocument).toHaveBeenNthCalledWith(
        2,
        'def',
        'arn:ingest:topic:arn'
      );

      // Make sure the published date is written to S3.
      const lastKnownPublishedDateString = await s3Utils.getObjectText(
        pubDateS3Location
      );
      expect(new Date(lastKnownPublishedDateString)).toEqual(new Date('Wed, 10 Nov 2021 18:00:30 GMT'));
    });
  });

  describe('when there is a last known published date', () => {
    describe('when the feed has been published since our last ingest', () => {
      beforeAll(async () => {
        await s3Utils.putText(
          pubDateS3Location,
          'Tue Nov 9 2021 13:00:30 GMT-0500 (Eastern Standard Time)'
        );
      });

      afterAll(async () => {
        await s3Utils.deleteObject(pubDateS3Location);
      });

      test('should queue all documents for ingest', async () => {
        // @ts-ignore
        dspaceClient.getFeed = jest.fn().mockImplementationOnce(() => ({
          channel: [{
            pubDate: [{
              _: 'Wed, 10 Nov 2021 18:00:30 GMT',
            }],
            item: [{
              link: ['https://repository.oceanbestpractices.org/handle/11329/1774'],
              pubDate: ['Fri, 01 Jan 2021 00:00:00 GMT'],
            }, {
              link: ['https://repository.oceanbestpractices.org/handle/11329/1772'],
              pubDate: ['Mon, 01 Jan 2007 00:00:00 GMT'],
            }],
          }],
        }));

        // @ts-ignore
        dspaceClient.find = jest
          .fn()
          .mockImplementationOnce(() => ([
            {
              uuid: 'abc',
            },
          ]))
          .mockImplementationOnce(() => ([
            {
              uuid: 'def',
            },
          ]));

        // @ts-ignore
        ingestQueue.queueIngestDocument = jest.fn();

        await dspaceFeedIngester.handler();

        expect(dspaceClient.getFeed).toHaveBeenCalledTimes(1);
        expect(dspaceClient.getFeed).toHaveBeenCalledWith('https://dspace.test.com');

        expect(dspaceClient.find).toHaveBeenCalledTimes(2);
        expect(dspaceClient.find).toHaveBeenNthCalledWith(
          1,
          'https://dspace.test.com',
          'dc.identifier.uri',
          'https://repository.oceanbestpractices.org/handle/11329/1774'
        );
        expect(dspaceClient.find).toHaveBeenNthCalledWith(
          2,
          'https://dspace.test.com',
          'dc.identifier.uri',
          'https://repository.oceanbestpractices.org/handle/11329/1772'
        );

        expect(ingestQueue.queueIngestDocument).toHaveBeenCalledTimes(2);
        expect(ingestQueue.queueIngestDocument).toHaveBeenNthCalledWith(
          1,
          'abc',
          'arn:ingest:topic:arn'
        );
        expect(ingestQueue.queueIngestDocument).toHaveBeenNthCalledWith(
          2,
          'def',
          'arn:ingest:topic:arn'
        );

        // Make sure the published date is written to S3.
        const lastKnownPublishedDateString = await s3Utils.getObjectText(
          pubDateS3Location
        );
        expect(new Date(lastKnownPublishedDateString)).toEqual(new Date('Wed, 10 Nov 2021 18:00:30 GMT'));
      });
    });

    describe('when the feed has not been published since our last ingest', () => {
      beforeAll(async () => {
        await s3Utils.putText(
          pubDateS3Location,
          'Wed Nov 10 2021 13:00:30 GMT-0500 (Eastern Standard Time)'
        );
      });

      afterAll(async () => {
        await s3Utils.deleteObject(pubDateS3Location);
      });

      test('should not queue any documents for ingest', async () => {
        // @ts-ignore
        dspaceClient.getFeed = jest.fn().mockImplementationOnce(() => ({
          channel: [{
            pubDate: [{
              _: 'Wed, 10 Nov 2021 18:00:30 GMT',
            }],
            item: [{
              link: ['https://repository.oceanbestpractices.org/handle/11329/1774'],
              pubDate: ['Fri, 01 Jan 2021 00:00:00 GMT'],
            }, {
              link: ['https://repository.oceanbestpractices.org/handle/11329/1772'],
              pubDate: ['Mon, 01 Jan 2007 00:00:00 GMT'],
            }],
          }],
        }));

        // @ts-ignore
        dspaceClient.find = jest.fn();

        // @ts-ignore
        ingestQueue.queueIngestDocument = jest.fn();

        await dspaceFeedIngester.handler();

        expect(dspaceClient.getFeed).toHaveBeenCalledTimes(1);
        expect(dspaceClient.getFeed).toHaveBeenCalledWith('https://dspace.test.com');

        expect(dspaceClient.find).toHaveBeenCalledTimes(0);

        expect(ingestQueue.queueIngestDocument).toHaveBeenCalledTimes(0);

        // Make sure the published date is written to S3.
        const lastKnownPublishedDateString = await s3Utils.getObjectText(
          pubDateS3Location
        );
        expect(lastKnownPublishedDateString).toBe('Wed Nov 10 2021 13:00:30 GMT-0500 (Eastern Standard Time)');
      });
    });
  });
});
