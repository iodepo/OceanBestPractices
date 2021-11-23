/* eslint-disable no-underscore-dangle */
import * as dspaceClient from '../../lib/dspace-client';
import * as ir from './index-rectifier';
import * as osClient from '../../lib/open-search-client';
import queueIngestDocument from './ingest-queue';

describe('index-rectifier', () => {
  describe('commitUpdatedItems', () => {
    test('should queue updated items for ingest', async () => {
      queueIngestDocument = jest.fn(async () => ({
        $metadata: {},
        MessageId: 'foo',
        SequenceNumber: '456',
      }));

      const updatedItems = ['123', '456'];

      await ir.commitUpdatedItems(
        updatedItems,
        'arn:ingestTopicArn'
      );

      expect(utils.queueIngestDocument).toBeCalledTimes(2);
      expect(utils.queueIngestDocument).toBeCalledWith(
        '123',
        'arn:ingestTopicArn',
        { region: 'us-east-1' }
      );
      expect(utils.queueIngestDocument).toBeCalledWith(
        '456',
        'arn:ingestTopicArn',
        { region: 'us-east-1' }
      );
    });
  });

  describe('commitRemovedItems', () => {
    test('should remove items from the index', async () => {
      osClient.bulkDelete = jest.fn();

      const removedItems = ['123', '456'];

      await ir.commitRemovedItems(
        removedItems,
        'https://opensearch.example.com'
      );

      expect(osClient.bulkDelete).toBeCalledTimes(1);
      expect(osClient.bulkDelete).toBeCalledWith(
        'https://opensearch.example.com',
        'documents',
        ['123', '456']
      );
    });
  });

  describe('isUpdated', () => {
    test('should determine an index item needs updating if lastModified has changed', () => {
      const dspaceItem = {
        lastModified: '2020-11-01 23:05:25.261',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'f91a9870078dc75784288b41be5f1911',
            },
          },
        ],
      };

      const indexItem = {
        _source: {
          lastModified: '2020-05-06 23:05:25.261',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'f91a9870078dc75784288b41be5f1911',
              },
            },
          ],
        },
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
        _id: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        _source: {
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
        },
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeTruthy();
    });

    test('should determine an index item does not need updating', () => {
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
        _id: '73ff2010-39d3-4b2d-bef3-420f347c3999',
        _source: {
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
        },
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeFalsy();
    });
  });

  describe('diff', () => {
    test('should compare index items with the DSpace repository and produce a list of updated and removed items', async () => {
      const mockIndexItem1 = {
        _id: '1',
        _source: {
          uuid: 'a',
          lastModified: '2021-10-25 12:31:38.543',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
            },
          ],
        },
      };

      const mockIndexItem2 = {
        _id: '2',
        _source: {
          uuid: 'b',
          lastModified: '2021-9-25 12:31:38.543',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
            },
          ],
        },
      };

      const mockIndexItem3 = {
        _id: '3',
        _source: {
          uuid: 'c',
          lastModified: '2021-8-25 12:31:38.543',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
            },
          ],
        },
      };

      const mockIndexItem4 = {
        _id: '4',
        _source: {
          uuid: 'd',
          lastModified: '2021-8-25 12:31:38.543',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
            },
          ],
        },
      };

      osClient.openScroll = jest.fn().mockImplementation(() => ({
        _scroll_id: 'mockScrollId1',
        hits: {
          hits: [
            mockIndexItem1,
          ],
        },
      }));

      osClient.nextScroll = jest
        .fn()
        .mockImplementationOnce(() => ({
          _scroll_id: 'mockScrollId2',
          hits: {
            hits: [
              mockIndexItem2,
              mockIndexItem3,
              mockIndexItem4,
            ],
          },
        }))
        .mockImplementationOnce(() => ({
          _scroll_id: 'mockScrollId2',
          hits: {
            hits: [],
          },
        }));

      osClient.closeScroll = jest.fn().mockImplementation(() => ({
        succeeded: true,
        num_freed: 5,
      }));

      const mockDSpaceItem1 = {
        uuid: 'a',
        lastModified: '2021-10-27 17:52:15.515', // Updated via lastModified.
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      };

      const mockDSpaceItem2 = {
        uuid: 'b',
        lastModified: '2021-9-25 12:31:38.543',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'cde', // Updated via PDF bistream checkSum.
            },
          },
        ],
      };

      // Not updated.
      const mockDSpaceItem3 = {
        uuid: 'c',
        lastModified: '2021-8-25 12:31:38.543',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'abc',
            },
          },
        ],
      };

      dspaceClient.getItem = jest
        .fn()
        .mockImplementationOnce(() => (mockDSpaceItem1))
        .mockImplementationOnce(() => (mockDSpaceItem2))
        .mockImplementationOnce(() => (mockDSpaceItem3))
        .mockImplementationOnce(() => undefined); // Item not found.

      const mockOpenSearchEndpoint = 'https://open-search.example.com';
      const mockDSpaceEndpoint = 'https://dspace.example.com';
      const result = await ir.diff(mockOpenSearchEndpoint, mockDSpaceEndpoint);

      expect(result).toEqual({
        updated: ['a', 'b'],
        removed: ['d'],
      });

      expect(osClient.openScroll).toHaveBeenCalledTimes(1);
      expect(osClient.openScroll).toHaveBeenCalledWith(
        mockOpenSearchEndpoint,
        'documents',
        {
          includes: ['uuid', 'bitstreams', 'lastModified'],
        }
      );

      expect(osClient.nextScroll).toHaveBeenCalledTimes(2);
      expect(osClient.nextScroll).toHaveBeenNthCalledWith(1, mockOpenSearchEndpoint, 'mockScrollId1');
      expect(osClient.nextScroll).toHaveBeenNthCalledWith(2, mockOpenSearchEndpoint, 'mockScrollId2');

      expect(osClient.closeScroll).toHaveBeenCalledTimes(1);
      expect(osClient.closeScroll).toHaveBeenCalledWith(mockDSpaceEndpoint, 'mockScrollId2');

      expect(dspaceClient.getItem).toHaveBeenCalledTimes(4);
      expect(dspaceClient.getItem).toHaveBeenNthCalledWith(
        1,
        mockDSpaceEndpoint,
        mockIndexItem1._source.uuid
      );
      expect(dspaceClient.getItem).toHaveBeenNthCalledWith(
        2,
        mockDSpaceEndpoint,
        mockIndexItem2._source.uuid
      );
      expect(dspaceClient.getItem).toHaveBeenNthCalledWith(
        3,
        mockDSpaceEndpoint,
        mockIndexItem3._source.uuid
      );
      expect(dspaceClient.getItem).toHaveBeenNthCalledWith(
        4,
        mockDSpaceEndpoint,
        mockIndexItem4._source.uuid
      );
    });
  });
});
