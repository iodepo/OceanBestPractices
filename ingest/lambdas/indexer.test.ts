/* eslint-disable no-underscore-dangle */
/* eslint-disable unicorn/no-null */
import cryptoRandomString from 'crypto-random-string';
import nock from 'nock';

import * as osClient from '../../lib/open-search-client';
import * as indexer from './indexer';
import * as s3Utils from '../../lib/s3-utils';

const dspaceItemBucket = `bucket-${cryptoRandomString({ length: 6 })}`;
const bitstreamTextBucket = `bucket-${cryptoRandomString({ length: 6 })}`;

const openSearchEndpoint = 'http://localhost:9200';

describe('indexer', () => {
  beforeAll(async () => {
    await s3Utils.createBucket(dspaceItemBucket);
    await s3Utils.createBucket(bitstreamTextBucket);

    nock.disableNetConnect();

    nock.enableNetConnect((host) => {
      const [hostname, port] = host.split(':');

      if (port === undefined) throw new Error('Expected a local stack or ES port.');

      return hostname === 'localhost'
        && ['4566', '9200'].includes(port);
    });
  });

  beforeEach(() => {
    process.env['DOCUMENT_METADATA_BUCKET'] = dspaceItemBucket;
    process.env['OPEN_SEARCH_ENDPOINT'] = openSearchEndpoint;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.enableNetConnect();

    await s3Utils.deleteBucket(dspaceItemBucket, true);
    await s3Utils.deleteBucket(bitstreamTextBucket, true);
  });

  describe('getDSpaceItemFields', () => {
    test('should return fields for an existing DSpace item', async () => {
      const dspaceItemUUID = 'dbe0240b-403e-49f1-8386-17863ba1285b';
      const dspaceItem = {
        uuid: dspaceItemUUID,
        handle: '11329/874.2',
        lastModified: '2021-07-05T19:56:13Z',
        bitstreams: [
          {
            uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
            name: 'oceansites_data_format_reference_manual.pdf',
            handle: null,
            type: 'bitstream',
            expand: [
              'parent',
              'policies',
              'all',
            ],
            bundleName: 'ORIGINAL',
            description: 'PDF (Version 1.4, Endorsed)',
            format: 'Adobe PDF',
            mimeType: 'application/pdf',
            sizeBytes: 873_856,
            parentObject: null,
            retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
            checkSum: {
              value: '6a45c8850908937a88f18e9a87674393',
              // checkSumAlgorithm: 'MD5',
            },
            sequenceId: 5,
            policies: null,
            link: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018',
          },
        ],
        metadata: [
          {
            key: 'dc.date.accessioned',
            value: '2021-07-05T19:56:13Z',
          },
        ],
      };

      await s3Utils.putJson(
        new s3Utils.S3ObjectLocation(
          dspaceItemBucket,
          `${dspaceItemUUID}.json`
        ),
        dspaceItem
      );
      const result = await indexer.getDSpaceItemFields(
        dspaceItemBucket,
        `${dspaceItemUUID}.json`
      );
      expect(result).toEqual(dspaceItem);
    });
  });

  describe('getBitstreamSource', () => {
    test('should return the bitstream source fields', async () => {
      const bitstreamTextKey = 'bitstreamSourceKey.txt';
      await s3Utils.putText(
        new s3Utils.S3ObjectLocation(
          bitstreamTextBucket,
          bitstreamTextKey
        ),
        'Hello world!'
      );

      const result = await indexer.getBitstreamTextSource(
        bitstreamTextBucket,
        bitstreamTextKey
      );

      expect(result).toEqual({
        _bitstreamText: 'Hello world!',
        _bitstreamTextKey: bitstreamTextKey,
      });
    });
  });

  describe('getMetadataSearchFields', () => {
    test('should return single DSpace metadata keys and values', () => {
      const metadata = [
        {
          key: 'dc.date.accessioned',
          value: '2021-07-05T19:56:13Z',
          language: '',
          element: 'date',
          qualifier: 'accessioned',
          schema: 'dc',
        },
        {
          key: 'dc.date.available',
          value: '2019-03-08T14:46:45Z',
          language: '',
          element: 'date',
          qualifier: 'available',
          schema: 'dc',
        },
      ];

      const result = indexer.getMetadataSearchFields(
        metadata
      );
      expect(result).toEqual({
        dc_date_accessioned: '2021-07-05T19:56:13Z',
        dc_date_available: '2019-03-08T14:46:45Z',
      });
    });

    test('should return an array for DSpace Metadata fields with identical keys', () => {
      const metadata = [
        {
          key: 'dc.contributor.author',
          value: 'Paul Pilone',
          language: '',
          element: 'date',
          qualifier: 'accessioned',
          schema: 'dc',
        },
        {
          key: 'dc.contributor.author',
          value: 'Marc Huffnagle',
          language: '',
          element: 'date',
          qualifier: 'available',
          schema: 'dc',
        },
      ];

      const result = indexer.getMetadataSearchFields(
        metadata
      );

      expect(result).toEqual({
        dc_contributor_author: [
          'Paul Pilone',
          'Marc Huffnagle',
        ],
      });
    });
  });

  describe('getThumbnailRetrieveLink', () => {
    test('should return the thumbnail retrieve link', () => {
      const bitstreams = [
        {
          uuid: '7aaf9c50-a23a-499d-867b-0184da2cc74c',
          name: 'lom3.10403.pdf.txt',
          handle: null,
          type: 'bitstream',
          expand: [
            'parent',
            'policies',
            'all',
          ],
          bundleName: 'TEXT',
          description: 'Extracted text',
          format: 'Text',
          mimeType: 'text/plain',
          sizeBytes: 70_216,
          parentObject: null,
          retrieveLink: '/rest/bitstreams/7aaf9c50-a23a-499d-867b-0184da2cc74c/retrieve',
          checkSum: {
            value: 'd55b77a8fd961a0aeb03bcc3572b6533',
            checkSumAlgorithm: 'MD5',
          },
          sequenceId: 4,
          policies: null,
          link: '/rest/bitstreams/7aaf9c50-a23a-499d-867b-0184da2cc74c',
        },
        {
          uuid: '5940f3b4-5dd3-4230-ae4e-28b2e2b47339',
          name: 'lom3.10403.pdf.jpg',
          handle: null,
          type: 'bitstream',
          expand: [
            'parent',
            'policies',
            'all',
          ],
          bundleName: 'THUMBNAIL',
          description: 'Generated Thumbnail',
          format: 'JPEG',
          mimeType: 'image/jpeg',
          sizeBytes: 17_547,
          parentObject: null,
          retrieveLink: '/rest/bitstreams/5940f3b4-5dd3-4230-ae4e-28b2e2b47339/retrieve',
          checkSum: {
            value: 'c783d629b0f6905dafa49d779e3a31e1',
            checkSumAlgorithm: 'MD5',
          },
          sequenceId: 5,
          policies: null,
          link: '/rest/bitstreams/5940f3b4-5dd3-4230-ae4e-28b2e2b47339',
        },
      ];

      const result = indexer.getThumbnailRetrieveLink(
        bitstreams
      );

      expect(result).toEqual({
        _thumbnailRetrieveLink: '/rest/bitstreams/5940f3b4-5dd3-4230-ae4e-28b2e2b47339/retrieve',
      });
    });

    test('should return undefined if no thumbnail exists', () => {
      const bitstreams = [
        {
          uuid: '7aaf9c50-a23a-499d-867b-0184da2cc74c',
          name: 'lom3.10403.pdf.txt',
          handle: null,
          type: 'bitstream',
          expand: [
            'parent',
            'policies',
            'all',
          ],
          bundleName: 'TEXT',
          description: 'Extracted text',
          format: 'Text',
          mimeType: 'text/plain',
          sizeBytes: 70_216,
          parentObject: null,
          retrieveLink: '/rest/bitstreams/7aaf9c50-a23a-499d-867b-0184da2cc74c/retrieve',
          checkSum: {
            value: 'd55b77a8fd961a0aeb03bcc3572b6533',
            checkSumAlgorithm: 'MD5',
          },
          sequenceId: 4,
          policies: null,
          link: '/rest/bitstreams/7aaf9c50-a23a-499d-867b-0184da2cc74c',
        },
      ];

      const result = indexer.getThumbnailRetrieveLink(
        bitstreams
      );
      expect(result).toBeUndefined();
    });
  });

  describe('indexer.handler', () => {
    describe('when indexing a document', () => {
      beforeAll(async () => {
        await s3Utils.putJson(
          new s3Utils.S3ObjectLocation(
            dspaceItemBucket,
            '01ebed91-218a-4465-8a67-f6712ff3cfb7.json'
          ),
          {
            uuid: '01ebed91-218a-4465-8a67-f6712ff3cfb7',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'ORIGINAL',
                mimeType: 'application/pdf',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello document with a PDF!',
              },
            ],
          }
        );

        await s3Utils.putJson(
          new s3Utils.S3ObjectLocation(
            dspaceItemBucket,
            '9c404a3c-a09a-44f9-b27b-67c8ec2b95bc.json'
          ),
          {
            uuid: '9c404a3c-a09a-44f9-b27b-67c8ec2b95bc',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'ORIGINAL',
                mimeType: 'application/pdf',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello another document with a PDF!',
              },
            ],
          }
        );

        await s3Utils.putJson(
          new s3Utils.S3ObjectLocation(
            dspaceItemBucket,
            '2982b980-5bb3-4964-9cdb-ceaf602f3599.json'
          ),
          {
            uuid: '2982b980-5bb3-4964-9cdb-ceaf602f3599',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello document without a PDF!',
              },
            ],
          }
        );

        await s3Utils.putText(
          new s3Utils.S3ObjectLocation(
            bitstreamTextBucket,
            '01ebed91-218a-4465-8a67-f6712ff3cfb7.txt'
          ),
          'Bitstream text for 01ebed91-218a-4465-8a67-f6712ff3cfb7.'
        );

        await s3Utils.putText(
          new s3Utils.S3ObjectLocation(
            bitstreamTextBucket,
            '9c404a3c-a09a-44f9-b27b-67c8ec2b95bc.txt'
          ),
          'Bitstream text for 9c404a3c-a09a-44f9-b27b-67c8ec2b95bc.'
        );

        // Create the terms index.
        await osClient.createTermsIndex(
          'http://localhost:9200',
          'terms'
        );

        await osClient.addDocument(
          'http://localhost:9200',
          'terms',
          {
            query: {
              multi_match: {
                query: 'Hello',
                type: 'phrase',
                fields: ['contents', 'title'],
              },
            },
            source_terminology: 'Test Terminology',
            namedUriGraph: 'https://test-terminology.owl',
          }
        );

        await osClient.refreshIndex(
          openSearchEndpoint,
          'terms'
        );
      });

      afterAll(async () => {
        await osClient.deleteIndex(openSearchEndpoint, 'terms');
        await osClient.deleteIndex(openSearchEndpoint, 'documents');
      });

      describe('and invoked by the text extractor', () => {
        test('should index documents with all index-able fields', async () => {
          const snsEvent = {
            Records: [
              {
                Sns: {
                  Message: JSON.stringify({
                    Records: [
                      {
                        s3: {
                          bucket: {
                            name: bitstreamTextBucket,
                          },
                          object: {
                            key: '01ebed91-218a-4465-8a67-f6712ff3cfb7.txt',
                          },
                        },
                      },
                    ],
                  }),
                },
              },
              {
                Sns: {
                  Message: JSON.stringify({
                    Records: [
                      {
                        s3: {
                          bucket: {
                            name: bitstreamTextBucket,
                          },
                          object: {
                            key: '9c404a3c-a09a-44f9-b27b-67c8ec2b95bc.txt',
                          },
                        },
                      },
                    ],
                  }),
                },
              },
            ],
          };

          await indexer.handler(snsEvent);

          // Fetch the object from OpenSearch.
          const result1 = await osClient.getDocument(
            openSearchEndpoint,
            'documents',
            '01ebed91-218a-4465-8a67-f6712ff3cfb7'
          ) as { _id: string, _source: Record<string, unknown> };

          expect(result1._id).toEqual('01ebed91-218a-4465-8a67-f6712ff3cfb7');
          expect(result1._source).toEqual({
            uuid: '01ebed91-218a-4465-8a67-f6712ff3cfb7',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'ORIGINAL',
                mimeType: 'application/pdf',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello document with a PDF!',
              },
            ],
            dc_title: 'Hello document with a PDF!',
            dc_date_accessioned: '2021-07-05T19:56:13Z',
            _bitstreamText: 'Bitstream text for 01ebed91-218a-4465-8a67-f6712ff3cfb7.',
            _bitstreamTextKey: '01ebed91-218a-4465-8a67-f6712ff3cfb7.txt',
            _terms: [
              {
                label: 'Hello',
                source_terminology: 'Test Terminology',
                uri: 'QJ3tlX0BJYfKtNy3YNa9',
              },
            ],
            _thumbnailRetrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
          });

          const result2 = await osClient.getDocument(
            openSearchEndpoint,
            'documents',
            '2982b980-5bb3-4964-9cdb-ceaf602f3599'
          ) as { _id: string, _source: Record<string, unknown> };
          expect(result2._id).toEqual('9c404a3c-a09a-44f9-b27b-67c8ec2b95bc');
          expect(result2._source).toEqual({
            uuid: '9c404a3c-a09a-44f9-b27b-67c8ec2b95bc',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'ORIGINAL',
                mimeType: 'application/pdf',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello another document with a PDF!',
              },
            ],
            dc_title: 'Hello another document with a PDF!',
            dc_date_accessioned: '2021-07-05T19:56:13Z',
            _bitstreamText: 'Bitstream text for 9c404a3c-a09a-44f9-b27b-67c8ec2b95bc.',
            _bitstreamTextKey: '01ebed91-218a-4465-8a67-f6712ff3cfb7.txt',
            _terms: [
              {
                label: 'Hello',
                source_terminology: 'Test Terminology',
                uri: 'QJ3tlX0BJYfKtNy3YNa9',
              },
            ],
            _thumbnailRetrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
          });
        });
      });

      describe('and invoked by a Lambda event', () => {
        test('should index a document with all fields except bitstream source fields', async () => {
          const invokeEvent = {
            uuid: '2982b980-5bb3-4964-9cdb-ceaf602f3599',
          };

          await indexer.handler(invokeEvent);

          // Fetch the object from OpenSearch.
          const result = await osClient.getDocument(
            'http://localhost:9200',
            'documents',
            '2982b980-5bb3-4964-9cdb-ceaf602f3599'
          ) as { _id: string, _source: Record<string, unknown> };

          expect(result._id).toEqual('2982b980-5bb3-4964-9cdb-ceaf602f3599');
          expect(result._source).toEqual({
            uuid: '2982b980-5bb3-4964-9cdb-ceaf602f3599',
            handle: '11329/874.2',
            lastModified: '2021-11-15 11:30:57.109',
            bitstreams: [
              {
                uuid: 'da66b42c-b435-4c47-981c-44da170a1018',
                name: 'oceansites_data_format_reference_manual.pdf',
                bundleName: 'THUMBNAIL',
                mimeType: 'image/jpg',
                retrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
                checkSum: {
                  value: '6a45c8850908937a88f18e9a87674393',
                },
              },
            ],
            metadata: [
              {
                key: 'dc.date.accessioned',
                value: '2021-07-05T19:56:13Z',
              },
              {
                key: 'dc.title',
                value: 'Hello document without a PDF!',
              },
            ],
            dc_title: 'Hello document without a PDF!',
            dc_date_accessioned: '2021-07-05T19:56:13Z',
            _terms: [
              {
                label: 'Hello',
                source_terminology: 'Test Terminology',
                uri: 'QJ3tlX0BJYfKtNy3YNa9',
              },
            ],
            _thumbnailRetrieveLink: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018/retrieve',
          });
        });
      });
    });

    describe('when failing to index a document', () => {
      describe('and invoked by an invalid event', () => {
        test('should throw an error', async () => {
          const randomEvent = {
            Records: [],
            s3: 'bucket',
          };

          await expect(indexer.handler(randomEvent)).rejects.toThrow(Error);
        });
      });
    });
  });
});
