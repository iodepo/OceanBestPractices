import nock from 'nock';
import * as dspaceClient from './dspace-client';

describe('dspace-client', () => {
  describe('find', () => {
    test('it should return a DSpace item for a valid metadata field and value', async () => {
      const mockItems = [{
        uuid: 'testUUID',
        handle: '11329/1160',
      }];

      nock('https://repository.oceanbestpractices.org')
        .post('/rest/items/find-by-metadata-field', {
          key: 'dc.identifier.uri',
          value: 'abc/123',
        })
        .query({ expand: 'metadata,bitstreams' })
        .reply(200, mockItems);

      const item = await dspaceClient.find(
        'https://repository.oceanbestpractices.org',
        'dc.identifier.uri',
        'abc/123'
      );
      expect(item).toEqual(mockItems);
    });
  });

  describe('getFeed', () => {
    test('it should fetch and parse a DSpace RSS feed', async () => {
      const mockRawRSSFeed = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
          <channel>
              <title>Mock Unesco OBPS</title>
              <link>https://repository.oceanbestpractices.org:443</link>
              <description>Mock description.</description>
              <pubDate xmlns="http://apache.org/cocoon/i18n/2.1">Wed, 10 Nov 2021 18:00:30 GMT</pubDate>
              <dc:date>2021-11-10T18:00:30Z</dc:date>
              <item>
                  <title>Mock Item 1</title>
                  <link>https://repository.oceanbestpractices.org/handle/11329/1774</link>
                  <description>Mock Item 1 Description</description>
                  <pubDate>Fri, 01 Jan 2021 00:00:00 GMT</pubDate>
                  <guid isPermaLink="false">https://repository.oceanbestpractices.org/handle/11329/1774</guid>
                  <dc:date>2021-01-01T00:00:00Z</dc:date>
              </item>
              <item>
                  <title>Mock Item 2</title>
                  <link>https://repository.oceanbestpractices.org/handle/11329/1772</link>
                  <description>Mock Item 2 Description&#13;
This is a new line!
      </description>
                  <pubDate>Mon, 01 Jan 2007 00:00:00 GMT</pubDate>
                  <guid isPermaLink="false">https://repository.oceanbestpractices.org/handle/11329/1772</guid>
                  <dc:date>2007-01-01T00:00:00Z</dc:date>
              </item>
          </channel>
      </rss>
      `;

      nock('https://repository.oceanbestpractices.org')
        .get('/feed/rss_2.0/site')
        .reply(200, mockRawRSSFeed);

      const feed = await dspaceClient.getFeed('https://repository.oceanbestpractices.org');
      console.log(`Test Feed: ${JSON.stringify(feed)}`);
      expect(feed).toEqual({
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
      });
    });
  });

  describe('getItem', () => {
    test('should return a DSpace item for a valid UUID', async () => {
      const mockItem = {
        uuid: 'abc123',
        handle: '11329/1160',
      };

      nock('https://repository.oceanbestpractices.org')
        .get('/rest/items/abc123')
        .reply(200, mockItem);

      const item = await dspaceClient.getItem('https://repository.oceanbestpractices.org', 'abc123');
      expect(item).toEqual(mockItem);
    });

    test('should return undefined if the item is not found', async () => {
      nock('https://repository.oceanbestpractices.org')
        .get('/rest/items/b5789ae4-611a-4c6e-8b23-67e29cf01e31')
        .reply(404);

      // This is a valid format for a UUID but the item doesn't exist.
      const item = await dspaceClient.getItem(
        'https://repository.oceanbestpractices.org',
        'b5789ae4-611a-4c6e-8b23-67e29cf01e31'
      );

      expect(item).toBeUndefined();
    });
  });

  describe('getItems', () => {
    test('should return a list of DSpace items', async () => {
      const mockItems = [
        {
          uuid: 'testUUID1',
          handle: '11329/1160',
        },
        {
          uuid: 'testUUID2',
          handle: '11329/1160',
        },
      ];

      nock('https://repository.oceanbestpractices.org')
        .get('/rest/items')
        .query({
          expand: 'none',
          limit: 50,
          offset: 0,
        })
        .reply(200, mockItems);

      const items = await dspaceClient.getItems('https://repository.oceanbestpractices.org');
      expect(items).toEqual(mockItems);
    });
  });

  describe('getMetadata', () => {
    test('should return the metadata for a valid UUID', async () => {
      const mockItem = {
        uuid: 'abc/123',
        handle: '11329/1160',
      };

      nock('https://repository.oceanbestpractices.org')
        .get('/rest/items/abc123/metadata')
        .reply(200, mockItem);

      const item = await dspaceClient.getMetadata(
        'https://repository.oceanbestpractices.org',
        'abc123'
      );
      expect(item).toEqual(mockItem);
    });

    test('should return undefined if the item is not found', async () => {
      nock('https://repository.oceanbestpractices.org')
        .get('/rest/items/b5789ae4-611a-4c6e-8b23-67e29cf01e31/metadata')
        .reply(404);

      // This is a valid format for a UUID but the item doesn't exist.
      const item = await dspaceClient.getMetadata(
        'https://repository.oceanbestpractices.org',
        'b5789ae4-611a-4c6e-8b23-67e29cf01e31'
      );

      expect(item).toBeUndefined();
    });
  });

  describe('getBitstream', () => {
    test('should return the binary bitstream data', async () => {
      nock('https://repository.oceanbestpractices.org')
        .get('/rest/bitstreams/61bf8843-f320-4988-b2ef-4f575616bc87/retrieve')
        .reply(200, Buffer.from('Mock buffer.', 'utf8'));

      const bitsteamBuffer = await dspaceClient.getBitstream(
        'https://repository.oceanbestpractices.org',
        '/rest/bitstreams/61bf8843-f320-4988-b2ef-4f575616bc87/retrieve'
      );

      const bitstream = bitsteamBuffer.toString('utf8');
      expect(bitstream).toEqual('Mock buffer.');
    });
  });
});
