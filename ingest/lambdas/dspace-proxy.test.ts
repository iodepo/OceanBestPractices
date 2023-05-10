import nock from 'nock';
import * as dspaceClient from '../../lib/dspace-client';
import { handler } from './dspace-proxy';

jest.mock('../../lib/dspace-client', () => ({
  getItem: jest.fn(),
}));

describe('dspace-proxy', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('localhost');
  });

  beforeEach(() => {
    process.env['DSPACE_ENDPOINT'] = 'https://dspace.example.com';
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  test('it returns an item from DSpace for a given UUID', async () => {
    const mockUUID1 = '3fdfb55d-6ddb-4a1d-b880-fda542c1529b';

    const mockDSpaceItem1 = {
      uuid: mockUUID1,
      lastModified: '2021-10-27 17:52:15.515',
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
      .mockImplementationOnce(() => (mockDSpaceItem1));

    const mockEvent = {
      uuid: mockUUID1,
    };

    const dspaceItem = await handler(mockEvent);
    expect(dspaceItem).toEqual(mockDSpaceItem1);
  });

  test('it returns undefined for a non-existent DSpace item', async () => {
    (dspaceClient.getItem as jest.Mock)
      .mockImplementationOnce(() => undefined);

    const mockEvent = {
      uuid: '3fdfb55d-6ddb-4a1d-b880-fda542c1529b',
    };

    const dspaceItem = await handler(mockEvent);
    expect(dspaceItem).toBeUndefined();
  });
});
