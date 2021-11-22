// @ts-check
const nock = require('nock');
const dspaceClient = require('./dspace-client');

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
    test('it should return a DSpace RSS Feed', async () => {
      const mockRSSFeed = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
        <channel>
          <title>Unesco OBPS</title>
          </channel>
        </rss>
      `;

      nock('https://repository.oceanbestpractices.org')
        .get('/feed/rss_2.0/site')
        .reply(200, mockRSSFeed);

      const feed = await dspaceClient.getFeed('https://repository.oceanbestpractices.org');
      expect(feed).toEqual(mockRSSFeed);
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
});
