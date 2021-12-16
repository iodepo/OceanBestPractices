const dspaceFeedIngester = require('./rss-feed-ingester');
const dspaceClient = require('../../lib/dspace-client');
const ingestQueue = require('../lib/ingest-queue');

describe('rss-feed-ingester.handler', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('Wed, 9 Nov 2021 18:00:30 GMT'));

    process.env['DSPACE_ENDPOINT'] = 'https://dspace.test.com';
    process.env['INGEST_TOPIC_ARN'] = 'arn:ingest:topic:arn';
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should queue recently published documents for ingest', async () => {
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
  });
});
