const got = require('got');

const dspaceClient = require('../dspace-client');

jest.mock('got');

describe('dspace-client', () => {
  describe('find', () => {
    test('it should return a DSpace item for a valid metadata field and value', async () => {
      const mockItems = [{
        uuid: 'testUUID',
        handle: '11329/1160',
      }];

      got.post.mockResolvedValue(mockItems);

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

      got.mockResolvedValue(mockRSSFeed);

      const feed = await dspaceClient.getFeed('https://repository.oceanbestpractices.org');
      expect(feed).toEqual(mockRSSFeed);
    });
  });

  describe('getItem', () => {
    test('should return a DSpace item for a valid UUID', async () => {
      const mockItem = {
        uuid: 'testUUID',
        handle: '11329/1160',
      };

      got.mockResolvedValue(mockItem);

      const item = await dspaceClient.getItem('https://repository.oceanbestpractices.org', 'abc123');
      expect(item).toEqual(mockItem);
    });

    test('should return undefined if the item is not found', async () => {
      const mockError = new Error('MockError');
      mockError.response = { statusCode: 404 };
      got.mockImplementation(() => { throw mockError; });

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

      got.mockResolvedValue(mockItems);

      const items = await dspaceClient.getItems('https://repository.oceanbestpractices.org');
      expect(items).toEqual(mockItems);
    });
  });

  describe('getMetadata', () => {
    test('should return the metadata for a valid UUID', async () => {
      const mockItem = {
        uuid: 'testUUID',
        handle: '11329/1160',
      };

      got.mockResolvedValue(mockItem);

      const item = await dspaceClient.getMetadata(
        'https://repository.oceanbestpractices.org',
        'abc123'
      );
      expect(item).toEqual(mockItem);
    });

    test('should return undefined if the item is not found', async () => {
      const mockError = new Error('MockError');
      mockError.response = { statusCode: 404 };
      got.mockImplementation(() => { throw mockError; });

      // This is a valid format for a UUID but the item doesn't exist.
      const item = await dspaceClient.getMetadata(
        'https://repository.oceanbestpractices.org',
        'b5789ae4-611a-4c6e-8b23-67e29cf01e31'
      );

      expect(item).toBeUndefined();
    });
  });
});
