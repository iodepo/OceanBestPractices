/* eslint-disable unicorn/no-null */
import * as dspaceItem from './dspace-item';

const dspaceResponseObject = {
  bitstreams: [
    {
      uuid: 'a7df78b6-9d29-4919-a920-c1bddf7be7b0',
      bundleName: 'ORIGINAL',
      mimeType: 'application/pdf',
    },
    {
      uuid: '5940f3b4-5dd3-4230-ae4e-28b2e2b47339',
      bundleName: 'THUMBNAIL',
      mimeType: 'image/jpeg',
    },
  ],
  metadata: [
    {
      key: 'dc.contributor.author',
      value: 'Macovei, Vlad A.',
    },
    {
      key: 'dc.contributor.author',
      value: 'Voynova, Yoana G.',
    },
    {
      key: 'dc.contributor.author',
      value: 'Becker, Meike',
    },
    {
      key: 'dc.contributor.author',
      value: 'Triest, Jack',
    },
    {
      key: 'dc.contributor.author',
      value: 'Petersen, Wilhelm',
    },
    {
      key: 'dc.title',
      value: 'Long-term intercomparison of two pCO2 instruments.',
    },
  ],
};

describe('dspace-item', () => {
  describe('findMetadataItems', () => {
    test('should return a list matching a single metadata item', () => {
      const [titleMetadata] = dspaceItem.findMetadataItems(
        dspaceResponseObject.metadata,
        'dc.title'
      );

      // Helps typescript know this isn't undefined in the other expects.
      if (titleMetadata === undefined) {
        fail('Title metadata is undefined');
      }
      expect(titleMetadata.key).toEqual('dc.title');
      expect(titleMetadata.value).toEqual('Long-term intercomparison of two pCO2 instruments.');
    });

    test('should return a list matching multiple metadata items', () => {
      const authors = dspaceItem.findMetadataItems(
        dspaceResponseObject.metadata,
        'dc.contributor.author'
      );

      expect(authors.length).toEqual(5);
    });
  });

  describe('thumbnailBitstreamItem', () => {
    test('should return the thumbnail bitstream item', () => {
      const thumbnailBitstreamItem = dspaceItem.findThumbnailBitstreamItem(
        dspaceResponseObject.bitstreams
      );

      // Helps typescript know this isn't undefined in the other expects.
      if (thumbnailBitstreamItem === undefined) {
        fail('Thumbnail bitstream is undefined');
      }
      expect(thumbnailBitstreamItem.retrieveLink).toEqual('/rest/bitstreams/5940f3b4-5dd3-4230-ae4e-28b2e2b47339/retrieve');
    });
  });

  describe('pdfBitstreamItem', () => {
    test('should return the pdf bitstream item', () => {
      const pdfBitstreamItem = dspaceItem.findPDFBitstreamItem(
        dspaceResponseObject.bitstreams
      );

      // Helps typescript know this isn't undefined in the other expects.
      if (pdfBitstreamItem === undefined) {
        fail('PDF bitstream is undefined');
      }
      expect(pdfBitstreamItem.retrieveLink).toEqual('/rest/bitstreams/a7df78b6-9d29-4919-a920-c1bddf7be7b0/retrieve');
    });
  });
});
