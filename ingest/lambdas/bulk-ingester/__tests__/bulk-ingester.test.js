const bulkIngester = require('../bulk-ingester');
const dspaceClient = require('../../index-rectifier/dspace-client');
const utils = require('../../index-rectifier/utils');

describe('bulk-ingester', () => {
  test('should queue all DSpace items for ingest', async () => {
    utils.queueIngestDocument = jest.fn(() => ({
      MessageId: 'abc',
      SequenceNumber: '123',
    }));

    dspaceClient.getItems = jest
      .fn()
      .mockImplementationOnce(() => ([
        {
          uuid: '1',
        },
        {
          uuid: '2',
        },
      ]))
      .mockImplementationOnce(() => ([
        {
          uuid: '3',
        },
      ]))
      .mockImplementationOnce(() => ([]));

    const mockDSpaceEndpoint = 'https://dspace.example.com';
    const mockIngestTopicArn = 'arn:ingestTopicArn';

    const result = await bulkIngester(
      mockDSpaceEndpoint,
      mockIngestTopicArn
    );

    expect(result).toEqual({
      success: ['1', '2', '3'],
      error: [],
    });

    expect(dspaceClient.getItems).toHaveBeenCalledTimes(3);
    expect(dspaceClient.getItems).toHaveBeenNthCalledWith(
      1,
      mockDSpaceEndpoint,
      {
        limit: 100,
      }
    );
    expect(dspaceClient.getItems).toHaveBeenNthCalledWith(
      2,
      mockDSpaceEndpoint,
      {
        limit: 100,
        offset: 2,
      }
    );
    expect(dspaceClient.getItems).toHaveBeenNthCalledWith(
      3,
      mockDSpaceEndpoint,
      {
        limit: 100,
        offset: 3,
      }
    );

    expect(utils.queueIngestDocument).toHaveBeenCalledTimes(3);
    expect(utils.queueIngestDocument).toHaveBeenNthCalledWith(1, '1', mockIngestTopicArn);
    expect(utils.queueIngestDocument).toHaveBeenNthCalledWith(2, '2', mockIngestTopicArn);
    expect(utils.queueIngestDocument).toHaveBeenNthCalledWith(3, '3', mockIngestTopicArn);
  });

  test('should return a list of items that failed to queue', async () => {
    utils.queueIngestDocument = jest
      .fn()
      .mockImplementationOnce(() => ({
        MessageId: 'abc',
        SequenceNumber: '123',
      }))
      .mockImplementationOnce(() => ({
        MessageId: 'abc',
        SequenceNumber: '123',
      }))
      .mockImplementationOnce(() => { throw new Error('MockError'); });

    dspaceClient.getItems = jest
      .fn()
      .mockImplementationOnce(() => ([
        {
          uuid: '1',
        },
        {
          uuid: '2',
        },
      ]))
      .mockImplementationOnce(() => ([
        {
          uuid: '3',
        },
      ]))
      .mockImplementationOnce(() => ([]));

    const mockDSpaceEndpoint = 'https://dspace.example.com';
    const mockIngestTopicArn = 'arn:ingestTopicArn';

    const result = await bulkIngester(
      mockDSpaceEndpoint,
      mockIngestTopicArn
    );

    expect(result).toEqual({
      success: ['1', '2'],
      error: ['3'],
    });
  });
});
