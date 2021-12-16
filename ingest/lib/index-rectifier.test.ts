/* eslint-disable no-underscore-dangle */
import * as dspaceClient from '../../lib/dspace-client';
import * as ir from './index-rectifier';
import { queueIngestDocument } from './ingest-queue';
import * as osClient from '../../lib/open-search-client';

jest.mock('./ingest-queue');

const mockQueueIngestDocument = queueIngestDocument as jest.MockedFunction<typeof queueIngestDocument>; // eslint-disable-line max-len

jest.mock('../../lib/open-search-client', () => ({
  bulkDelete: jest.fn(),
  nextScroll: jest.fn(),
  openScroll: jest.fn(),
  closeScroll: jest.fn(),
}));

jest.mock('../../lib/dspace-client', () => ({
  getItem: jest.fn(),
}));

describe('index-rectifier', () => {
  describe('commitUpdatedItems', () => {
    test('should queue updated items for ingest', async () => {
      mockQueueIngestDocument.mockResolvedValue({
        $metadata: {},
        MessageId: 'foo',
        SequenceNumber: '456',
      });

      const updatedItems = ['123', '456'];

      await ir.commitUpdatedItems(
        updatedItems,
        'arn:ingestTopicArn'
      );

      expect(queueIngestDocument).toBeCalledTimes(2);
      expect(queueIngestDocument).toBeCalledWith(
        '123',
        'arn:ingestTopicArn',
        'us-east-1'
      );
      expect(queueIngestDocument).toBeCalledWith(
        '456',
        'arn:ingestTopicArn',
        'us-east-1'
      );
    });
  });

  describe('commitRemovedItems', () => {
    test('should remove items from the index', async () => {
      (osClient.bulkDelete as jest.Mock).mockImplementation();

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
            retrieveLink: 'retrieveLink',
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
              retrieveLink: 'retrieveLink',
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
            retrieveLink: 'retrieveLink',
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
              retrieveLink: 'retrieveLink',
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
            retrieveLink: 'retrieveLink',
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
              retrieveLink: 'retrieveLink',
            },
          ],
        },
      };

      expect(ir.isUpdated(indexItem, dspaceItem)).toBeFalsy();
    });
  });

  describe('diff', () => {
    test.skip('should compare index items with the DSpace repository and produce a list of updated and removed items', async () => {
      const mockIndexItem1 = {
        _id: '1',
        _source: {
          uuid: '3fdfb55d-6ddb-4a1d-b880-fda542c1529b',
          lastModified: '2021-10-25 12:31:38.543',
          handle: 'handle/123',
          dc_title: 'Index Item 1',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
              retrieveLink: 'retrieveLink',
            },
          ],
          metadata: [],
        },
      };

      const mockIndexItem2 = {
        _id: '2',
        _source: {
          uuid: '66e3b2a3-fd2f-4300-9d1c-d0836b4e0a8d',
          lastModified: '2021-9-25 12:31:38.543',
          handle: 'handle/123',
          dc_title: 'Index Item 2',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
              retrieveLink: 'retrieveLink',
            },
          ],
          metadata: [],
        },
      };

      const mockIndexItem3 = {
        _id: '3',
        _source: {
          uuid: 'd013b8a0-718f-49ea-b30d-6788cba8292b',
          lastModified: '2021-8-25 12:31:38.543',
          handle: 'handle/123',
          dc_title: 'Index Item 3',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
              retrieveLink: 'retrieveLink',
            },
          ],
          metadata: [],
        },
      };

      const mockIndexItem4 = {
        _id: '4',
        _source: {
          uuid: 'dea11c14-1e9a-4ba2-8dbe-e6f9b7adeccb',
          lastModified: '2021-8-25 12:31:38.543',
          handle: 'handle/123',
          dc_title: 'Index Item 4',
          bitstreams: [
            {
              bundleName: 'ORIGINAL',
              description: 'PDF',
              format: 'Adobe PDF',
              mimeType: 'application/pdf',
              checkSum: {
                value: 'abc',
              },
              retrieveLink: 'retrieveLink',
            },
          ],
          metadata: [],
        },
      };

      (osClient.openScroll as jest.Mock).mockImplementation(() => ({
        _scroll_id: 'mockScrollId1',
        hits: {
          hits: [
            mockIndexItem1,
          ],
        },
      }));

      (osClient.nextScroll as jest.Mock)
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

      (osClient.closeScroll as jest.Mock).mockImplementation(() => ({
        succeeded: true,
        num_freed: 5,
      }));

      const mockDSpaceItem1 = {
        uuid: '3fdfb55d-6ddb-4a1d-b880-fda542c1529b',
        lastModified: '2021-10-27 17:52:15.515', // Updated via lastModified.
        handle: 'handle/123',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'abc',
            },
            retrieveLink: 'retrieveLink',
          },
        ],
        metadata: [],
      };

      const mockDSpaceItem2 = {
        uuid: '66e3b2a3-fd2f-4300-9d1c-d0836b4e0a8d',
        lastModified: '2021-9-25 12:31:38.543',
        handle: 'handle/123',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'cde', // Updated via PDF bistream checkSum.
            },
            retrieveLink: 'retrieveLink',
          },
        ],
        metadata: [],
      };

      // Not updated.
      const mockDSpaceItem3 = {
        uuid: 'd013b8a0-718f-49ea-b30d-6788cba8292b',
        lastModified: '2021-8-25 12:31:38.543',
        handle: 'handle/123',
        bitstreams: [
          {
            bundleName: 'ORIGINAL',
            description: 'PDF',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            checkSum: {
              value: 'abc',
            },
            retrieveLink: 'retrieveLink',
          },
        ],
        metadata: [],
      };

      (dspaceClient.getItem as jest.Mock)
        .mockImplementationOnce(() => (mockDSpaceItem1))
        .mockImplementationOnce(() => (mockDSpaceItem2))
        .mockImplementationOnce(() => (mockDSpaceItem3))
        .mockImplementationOnce(() => undefined); // Item not found.

      const mockOpenSearchEndpoint = 'https://open-search.example.com';
      const mockDSpaceEndpoint = 'https://dspace.example.com';
      const result = await ir.diff(mockOpenSearchEndpoint, mockDSpaceEndpoint);

      expect(result).toEqual({
        updated: ['3fdfb55d-6ddb-4a1d-b880-fda542c1529b', '66e3b2a3-fd2f-4300-9d1c-d0836b4e0a8d'],
        removed: ['dea11c14-1e9a-4ba2-8dbe-e6f9b7adeccb'],
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
