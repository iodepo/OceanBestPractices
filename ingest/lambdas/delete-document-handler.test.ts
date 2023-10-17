import { randomUUID } from 'crypto';
import nock from 'nock';
import { z } from 'zod';
import * as osClient from '../../lib/open-search-client';
import { handler } from './delete-document-handler';

const esUrl = 'http://localhost:9200';
const documentsIndexName = 'documents';

const deleteResponseSchema = z.object({
  deleted: z.number(),
});

describe('delete-document-handler', () => {
  const uuid1 = randomUUID();

  beforeAll(async () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'test-key-id';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test-access-key';
    process.env['OPEN_SEARCH_ENDPOINT'] = esUrl;

    nock.disableNetConnect();
    nock.enableNetConnect('localhost');

    await osClient.createDocumentsIndex(esUrl, documentsIndexName);
  });

  afterAll(async () => {
    await osClient.deleteIndex(esUrl, documentsIndexName);
    nock.enableNetConnect();
  });

  test('should delete a document from the documents index for a given UUID', async () => {
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

    await osClient.putDocumentItem(esUrl, documentItem1);
    await osClient.refreshIndex(esUrl, documentsIndexName);

    const mockEvent = {
      uuid: uuid1,
    };

    const result = await handler(mockEvent);

    const deleteResponse = deleteResponseSchema.parse(result);
    expect(deleteResponse.deleted).toEqual(1);

    const indexedDocumentItem1 = await osClient.getDocument(
      esUrl,
      documentsIndexName,
      uuid1
    );
    expect(indexedDocumentItem1).toBeUndefined();
  });

  test('should return a delete count of 0 for a non-existent UUID', async () => {
    const mockEvent = {
      uuid: randomUUID(),
    };

    const result = await handler(mockEvent);

    const deleteResponse = deleteResponseSchema.parse(result);
    expect(deleteResponse.deleted).toEqual(0);
  });
});
