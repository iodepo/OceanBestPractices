const got = require('got');

const DSpaceClient = require('../dspace-client');

jest.mock('got');

describe('dspace-client', () => {
  describe('find', () => {
    test('it should return a DSpace item for a valid metadata field and value', async () => {
      const client = new DSpaceClient('https://repository.oceanbestpractices.org');
      const mockItems = [{
        uuid: 'testUUID',
        handle: '11329/1160',
      }];

      got.post.mockResolvedValue(mockItems);

      const item = await client.find('dc.identifier.uri', 'abc/123');
      expect(item).toEqual(mockItems);
    });
  });

  describe('getFeed', () => {
    test('it should return a DSpace RSS Feed', async () => {
      const client = new DSpaceClient('https://repository.oceanbestpractices.org');
      const mockRSSFeed = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
        <channel>
          <title>Unesco OBPS</title>
          </channel>
        </rss>
      `;

      got.mockResolvedValue(mockRSSFeed);

      const feed = await client.getFeed();
      expect(feed).toEqual(mockRSSFeed);
    });
  });

  describe('getItem', () => {
    test('it should return a DSpace item for a valid UUID', async () => {
      const client = new DSpaceClient('https://repository.oceanbestpractices.org');
      const mockItem = {
        uuid: 'testUUID',
        handle: '11329/1160',
      };

      got.mockResolvedValue(mockItem);

      const item = await client.getItem('abc123');
      expect(item).toEqual(mockItem);
    });
  });

  describe('getMetadata', () => {
    test('it should return the metadata for a valid UUID', async () => {
      const client = new DSpaceClient('https://repository.oceanbestpractices.org');
      const mockItem = {
        uuid: 'testUUID',
        handle: '11329/1160',
      };

      got.mockResolvedValue(mockItem);

      const item = await client.getMetadata('abc123');
      expect(item).toEqual(mockItem);
    });
  });
});
