/* eslint-disable unicorn/no-null */
import { Bitstream, DSpaceItem } from '../../lib/dspace-types';

import * as indexer from './indexer';

import * as s3Client from '../../lib/s3-client';

jest.mock('../../lib/s3-client', () => ({
  getStringObject: jest.fn(),
}));

describe('indexer', () => {
  describe('buildDSpaceFields', () => {
    test('should add a DSpace Item to an existing object', () => {
      const existingTarget = { foo: 'bar' };

      const dspaceItem: DSpaceItem = {
        uuid: 'dbe0240b-403e-49f1-8386-17863ba1285b',
        name: 'OceanSITES Data Format Reference Manual NetCDF Conventions and Reference Tables. Version 1.4. July 16, 2020. [GOOS ENDORSED PRACTICE]',
        handle: '11329/874.2',
        type: 'item',
        expand: [
          'all',
        ],
        lastModified: '2021-11-15 11:30:57.109',
        parentCollection: null,
        parentCollectionList: null,
        parentCommunityList: null,
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
              checkSumAlgorithm: 'MD5',
            },
            sequenceId: 5,
            policies: null,
            link: '/rest/bitstreams/da66b42c-b435-4c47-981c-44da170a1018',
          },
        ],
        archived: 'true',
        withdrawn: 'false',
        link: '/rest/items/dbe0240b-403e-49f1-8386-17863ba1285b',
        metadata: [
          {
            key: 'dc.date.accessioned',
            value: '2021-07-05T19:56:13Z',
            language: '',
            element: 'date',
            qualifier: 'accessioned',
            schema: 'dc',
          },
        ],
      };

      const result = indexer.buildDSpaceFields(
        existingTarget,
        dspaceItem
      );
      expect(result).toEqual({
        foo: 'bar',
        ...dspaceItem,
      });
    });
  });

  describe('buildBitstreamSource', () => {
    test('should add bitstream source fields to an existing object', async () => {
      (s3Client.getStringObject as jest.Mock).mockResolvedValue('Hello world!');

      const existingTarget = { foo: 'bar' };

      const result = await indexer.buildBitstreamSource(
        existingTarget,
        {
          bitstreamTextBucket: 'bitstreamTextBucket',
          bitstreamTextKey: 'bitstreamTextKey',
          region: 'us-west-2',
        }
      );

      expect(result).toEqual({
        foo: 'bar',
        _bitstreamText: 'Hello world!',
        _bitstreamTextKey: 'bitstreamTextKey',
      });
    });

    test('should return the existing object unchanged if no bitstream source exists', async () => {
      const existingObject = { foo: 'bar' };
      const result = await indexer.buildBitstreamSource(
        existingObject,
        {
          bitstreamTextBucket: undefined,
          bitstreamTextKey: undefined,
          region: 'us-west-2',
        }
      );

      expect(result).toEqual({ foo: 'bar' });
    });
  });

  describe('buildMetadataSearchFields', () => {
    test('should add a single DSpace Metadata fields to an existing object', () => {
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

      const existingObject = { foo: 'bar' };
      const result = indexer.buildMetadataSearchFields(
        existingObject,
        metadata
      );
      expect(result).toEqual({
        foo: 'bar',
        dc_date_accessioned: '2021-07-05T19:56:13Z',
        dc_date_available: '2019-03-08T14:46:45Z',
      });
    });

    test('should add an array for like DSpace Metadata fields to an existing object', () => {
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

      const existingObject = { foo: 'bar' };
      const result = indexer.buildMetadataSearchFields(
        existingObject,
        metadata
      );

      expect(result).toEqual({
        foo: 'bar',
        dc_contributor_author: [
          'Paul Pilone',
          'Marc Huffnagle',
        ],
      });
    });
  });

  describe('buildThumbnailRetrieveLink', () => {
    test('should add the thumbnail retrieve link to an existing object', () => {
      const bitstreams: Bitstream[] = [
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

      const existingObject = { foo: 'bar' };
      const result = indexer.buildThumbnailRetrieveLink(
        existingObject,
        bitstreams
      );

      expect(result).toEqual({
        foo: 'bar',
        _thumbnailRetrieveLink: '/rest/bitstreams/5940f3b4-5dd3-4230-ae4e-28b2e2b47339/retrieve',
      });
    });

    test('should return the existing object unchanged if no thumbnail exists', () => {
      const bitstreams: Bitstream[] = [
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

      const existingObject = { foo: 'bar' };
      const result = indexer.buildThumbnailRetrieveLink(
        existingObject,
        bitstreams
      );
      expect(result).toEqual({ foo: 'bar' });
    });
  });
});
