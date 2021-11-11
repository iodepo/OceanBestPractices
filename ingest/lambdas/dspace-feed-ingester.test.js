const dspaceFeedIngester = require('./dspace-feed-ingester');
const dspaceClient = require('../../lib/dspace-client');
const ingestQueue = require('../lib/ingest-queue');

describe('dspace-feed-ingester', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('Wed, 9 Nov 2021 18:00:30 GMT'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should queue recently published documents for ingest', async () => {
    dspaceClient.getFeed = jest.fn().mockImplementationOnce(() => ({
      $: {
        'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
        version: '2.0',
      },
      channel: [{
        title: ['Mock Unesco OBPS'],
        link: ['https://repository.oceanbestpractices.org:443'],
        description: ['Mock description.'],
        pubDate: [{
          _: 'Wed, 10 Nov 2021 18:00:30 GMT',
          $: { xmlns: 'http://apache.org/cocoon/i18n/2.1' },
        }],
        'dc:date': ['2021-11-10T18:00:30Z'],
        item: [{
          title: ['Mock Item 1'],
          link: ['https://repository.oceanbestpractices.org/handle/11329/1774'],
          description: ['Mock Item 1 Description'],
          pubDate: ['Fri, 01 Jan 2021 00:00:00 GMT'],
          guid: [{
            _: 'https://repository.oceanbestpractices.org/handle/11329/1774',
            $: { isPermaLink: 'false' },
          }],
          'dc:date': ['2021-01-01T00:00:00Z'],
        }, {
          title: ['Mock Item 2'],
          link: ['https://repository.oceanbestpractices.org/handle/11329/1772'],
          description: ['Mock Item 2 Description\r\nThis is a new line!\n      '],
          pubDate: ['Mon, 01 Jan 2007 00:00:00 GMT'],
          guid: [{
            _: 'https://repository.oceanbestpractices.org/handle/11329/1772',
            $: { isPermaLink: 'false' },
          }],
          'dc:date': ['2007-01-01T00:00:00Z'],
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

    await dspaceFeedIngester();

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
