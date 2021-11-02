const ir = require('../index-rectifier');
const osClient = require('../open-search-client');
const utils = require('../utils');

describe('index-rectifier', () => {
  describe('commitUpdatedItems', () => {
    test('should queue updated items for ingest', async () => {
      utils.queueIngestDocument = jest.fn(() => ({
        MessageId: 'abc123',
        SequenceNumber: '456',
      }));

      const updatedItems = [
        {
          handle: 'handle/123',
        },
        {
          handle: 'handle/456',
        },
      ];

      await ir.commitUpdatedItems(
        updatedItems,
        'https://dspace-example.com',
        'arn:ingestTopicArn'
      );

      expect(utils.queueIngestDocument).toBeCalledTimes(2);
      expect(utils.queueIngestDocument).toBeCalledWith(
        'https://dspace-example.com/handle/123',
        'arn:ingestTopicArn',
        { region: 'us-east-1' }
      );
      expect(utils.queueIngestDocument).toBeCalledWith(
        'https://dspace-example.com/handle/456',
        'arn:ingestTopicArn',
        { region: 'us-east-1' }
      );
    });
  });

  describe('commitRemovedItems', () => {
    test('should remove items from the index', async () => {
      osClient.bulkDelete = jest.fn();

      const removedItems = [
        {
          _id: '123',
        },
        {
          _id: '456',
        },
      ];

      await ir.commitRemovedItems(
        removedItems,
        'https://opensearch.example.com'
      );

      expect(osClient.bulkDelete).toBeCalledTimes(1);
      expect(osClient.bulkDelete).toBeCalledWith(
        'https://opensearch.example.com',
        'documents',
        ['123', '456'],
        { region: 'us-east-1' }
      );
    });
  });

  describe('isUpdated', () => {
    test('should determine an index item needs updating if lastModified has changed', () => {
      const dspaceItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-11-01 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      const indexItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-05-06 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeTruthy();
    });

    test('should determine an index item needs updating if the bitstreams checksum has changed', () => {
      const dspaceItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-05-06 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1912',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      const indexItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-05-06 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeTruthy();
    });

    test.only('should determine an index item does not need updating', () => {
      const dspaceItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-05-06 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      const indexItem = {
        uuid: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        lastModified: '2020-05-06 23:05:25.261',
        bitstreams: [
          {
            uuid: 'd8045f8b-19c7-4878-b33a-4eff97d24447',
            bundleName: 'ORIGINAL',
            description: 'PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
              checkSumAlgorithm: 'MD5',
            },
          },
        ],
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeFalsy();
    });
  });

  describe('diff', () => {
    test('should compare index items with the DSpace repository and produce a list of updated and removed items', async () => {});
  });
});
