/* eslint-disable no-underscore-dangle */
import nock from 'nock';
import { randomUUID } from 'crypto';
import * as dspaceClient from '../../lib/dspace-client';
import * as ir from './index-rectifier';
import { queueIngestDocument } from './ingest-queue';
import * as osClient from '../../lib/open-search-client';
import { LambdaClient, nullLambdaClient } from '../../lib/lambda-client';

jest.mock('./ingest-queue');

const mockQueueIngestDocument = queueIngestDocument as jest.MockedFunction<typeof queueIngestDocument>; // eslint-disable-line max-len

const esUrl = 'http://localhost:9200';
const dspaceEndpoint = 'https://dspace.example.com';

const documentsIndexName = 'documents';

jest.mock('../../lib/dspace-client', () => ({
  getItem: jest.fn(),
}));

describe('index-rectifier', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('commitUpdatedItems', () => {
    test('should queue updated items for ingest', async () => {
      mockQueueIngestDocument.mockResolvedValue();

      const updatedItems = ['123', '456'];

      await ir.commitUpdatedItems(
        updatedItems,
        'arn:ingestTopicArn'
      );

      expect(queueIngestDocument).toBeCalledTimes(2);
      expect(queueIngestDocument).toBeCalledWith(
        '123',
        'arn:ingestTopicArn'
      );
      expect(queueIngestDocument).toBeCalledWith(
        '456',
        'arn:ingestTopicArn'
      );
    });
  });

  describe('commitRemovedItems', () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();

    beforeAll(async () => {
      await osClient.createDocumentsIndex(esUrl, documentsIndexName);

      const documentItem1 = {
        uuid: uuid1,
        bitstreamText: 'This is some sample content.',
        handle: 'handle/123',
        metadata: [{
          key: 'dc.contributor.author',
          value: 'Macovei, Vlad A.',
          language: '',
          element: 'contributor',
          qualifier: 'author',
          schema: 'dc',
        }],
        lastModified: '2021-11-01 15:10:17.231',
        bitstreams: [],
        dc_title: 'This is a sample name.',
      };

      const documentItem2 = {
        uuid: uuid2,
        bitstreamText: 'This is some sample content.',
        handle: 'handle/123',
        metadata: [{
          key: 'dc.contributor.author',
          value: 'Macovei, Vlad A.',
          language: '',
          element: 'contributor',
          qualifier: 'author',
          schema: 'dc',
        }],
        lastModified: '2021-11-01 15:10:17.231',
        bitstreams: [],
        dc_title: 'This is a sample name.',
      };

      await osClient.putDocumentItem(esUrl, documentItem1);
      await osClient.putDocumentItem(esUrl, documentItem2);
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteIndex(esUrl, documentsIndexName);
    });

    test('should remove items from the index', async () => {
      const removedItems = [uuid1, uuid2];

      await ir.commitRemovedItems(
        removedItems,
        esUrl
      );

      const indexedDoc1 = await osClient.getDocument(
        esUrl,
        documentsIndexName,
        uuid1
      );
      expect(indexedDoc1).toBeUndefined();

      const indexedDoc2 = await osClient.getDocument(
        esUrl,
        documentsIndexName,
        uuid2
      );
      expect(indexedDoc2).toBeUndefined();
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
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();
    const uuid3 = randomUUID();
    const uuid4 = randomUUID();

    beforeAll(async () => {
      await osClient.createDocumentsIndex(esUrl, documentsIndexName);

      const documentItem1 = {
        uuid: uuid1,
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
      };

      const documentItem2 = {
        uuid: uuid2,
        lastModified: '2021-09-25 12:31:38.543',
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
      };

      const documentItem3 = {
        uuid: uuid3,
        lastModified: '2021-08-25 12:31:38.543',
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
      };

      const documentItem4 = {
        uuid: uuid4,
        lastModified: '2021-08-25 12:31:38.543',
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
      };

      await osClient.putDocumentItem(esUrl, documentItem1);
      await osClient.putDocumentItem(esUrl, documentItem2);
      await osClient.putDocumentItem(esUrl, documentItem3);
      await osClient.putDocumentItem(esUrl, documentItem4);
      await osClient.refreshIndex(esUrl, documentsIndexName);
    });

    afterAll(async () => {
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid1 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid2 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid3 } });
      await osClient.deleteByQuery(esUrl, documentsIndexName, { match: { uuid: uuid4 } });
      await osClient.deleteIndex(esUrl, documentsIndexName);
    });

    test('should compare index items with the DSpace repository and produce a list of updated and removed items', async () => {
      const mockDSpaceItem1 = {
        uuid: uuid1,
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
        uuid: uuid2,
        lastModified: '2021-09-25 12:31:38.543',
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
        uuid: uuid3,
        lastModified: '2021-08-25 12:31:38.543',
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

      const fakeInvokeSuccessLambda: LambdaClient = {
        ...nullLambdaClient,
        invoke: (_, payload) => {
          // @ts-expect-error We don't care about error checking here
          const payloadObject = JSON.parse(payload);
          const payloadUUID = payloadObject['uuid'];
          if (payloadUUID === uuid1) {
            return Promise.resolve(JSON.stringify(mockDSpaceItem1));
          } if (payloadUUID === uuid2) {
            return Promise.resolve(JSON.stringify(mockDSpaceItem2));
          } if (payloadUUID === uuid3) {
            return Promise.resolve(JSON.stringify(mockDSpaceItem3));
          } if (payloadUUID === uuid4) {
            return Promise.resolve('undefined');
          }

          return Promise.reject();
        },
      };

      const result = await ir.diff(
        esUrl,
        dspaceEndpoint,
        fakeInvokeSuccessLambda
      );

      expect(result).toEqual({
        updated: [uuid1, uuid2],
        removed: [uuid4],
      });
    });
  });
});
