/* eslint-disable unicorn/no-null */
// eslint-disable-next-line import/no-unresolved
const DSpaceItem = require('./dspace-item');

const dspaceResponseObject = {
  uuid: '38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
  name: 'Long-term intercomparison of two pCO2.',
  handle: '11329/1766',
  type: 'item',
  expand: [
    'parentCollection',
    'parentCollectionList',
    'parentCommunityList',
    'all',
  ],
  lastModified: '2021-11-01 15:10:17.231',
  parentCollection: null,
  parentCollectionList: null,
  parentCommunityList: null,
  bitstreams: [
    {
      uuid: 'a7df78b6-9d29-4919-a920-c1bddf7be7b0',
      name: 'lom3.10403.pdf',
      handle: null,
      type: 'bitstream',
      expand: [
        'parent',
        'policies',
        'all',
      ],
      bundleName: 'ORIGINAL',
      description: 'PDF',
      format: 'Adobe PDF',
      mimeType: 'application/pdf',
      sizeBytes: 1_436_799,
      parentObject: null,
      retrieveLink: '/rest/bitstreams/a7df78b6-9d29-4919-a920-c1bddf7be7b0/retrieve',
      checkSum: {
        value: 'ba1c566ec8d084a4ef1a4e4f191b8447',
        checkSumAlgorithm: 'MD5',
      },
      sequenceId: 1,
      policies: null,
      link: '/rest/bitstreams/a7df78b6-9d29-4919-a920-c1bddf7be7b0',
    },
    {
      uuid: '4fca5a3c-f2a6-4b45-9e3b-3fa0e7a69bc2',
      name: 'license_rdf',
      handle: null,
      type: 'bitstream',
      expand: [
        'parent',
        'policies',
        'all',
      ],
      bundleName: 'CC-LICENSE',
      description: null,
      format: 'RDF XML',
      mimeType: 'application/rdf+xml; charset=utf-8',
      sizeBytes: 908,
      parentObject: null,
      retrieveLink: '/rest/bitstreams/4fca5a3c-f2a6-4b45-9e3b-3fa0e7a69bc2/retrieve',
      checkSum: {
        value: '0175ea4a2d4caec4bbcc37e300941108',
        checkSumAlgorithm: 'MD5',
      },
      sequenceId: 2,
      policies: null,
      link: '/rest/bitstreams/4fca5a3c-f2a6-4b45-9e3b-3fa0e7a69bc2',
    },
    {
      uuid: '41811ee2-b8c9-424e-aedb-f9568967c7f9',
      name: 'license.txt',
      handle: null,
      type: 'bitstream',
      expand: [
        'parent',
        'policies',
        'all',
      ],
      bundleName: 'LICENSE',
      description: null,
      format: 'License',
      mimeType: 'text/plain; charset=utf-8',
      sizeBytes: 1323,
      parentObject: null,
      retrieveLink: '/rest/bitstreams/41811ee2-b8c9-424e-aedb-f9568967c7f9/retrieve',
      checkSum: {
        value: '16ef4bb5db0a2f8c064e298a4ba82905',
        checkSumAlgorithm: 'MD5',
      },
      sequenceId: 3,
      policies: null,
      link: '/rest/bitstreams/41811ee2-b8c9-424e-aedb-f9568967c7f9',
    },
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
  ],
  archived: 'true',
  withdrawn: 'false',
  link: '/rest/items/38c7d808-aa26-4ed4-a3e4-3458b989d2d4',
  metadata: [
    {
      key: 'dc.contributor.author',
      value: 'Macovei, Vlad A.',
      language: '',
      element: 'contributor',
      qualifier: 'author',
      schema: 'dc',
    },
    {
      key: 'dc.contributor.author',
      value: 'Voynova, Yoana G.',
      language: '',
      element: 'contributor',
      qualifier: 'author',
      schema: 'dc',
    },
    {
      key: 'dc.contributor.author',
      value: 'Becker, Meike',
      language: '',
      element: 'contributor',
      qualifier: 'author',
      schema: 'dc',
    },
    {
      key: 'dc.contributor.author',
      value: 'Triest, Jack',
      language: '',
      element: 'contributor',
      qualifier: 'author',
      schema: 'dc',
    },
    {
      key: 'dc.contributor.author',
      value: 'Petersen, Wilhelm',
      language: '',
      element: 'contributor',
      qualifier: 'author',
      schema: 'dc',
    },
    {
      key: 'dc.coverage.spatial',
      value: 'Skagerrak Strait',
      language: 'en_US',
      element: 'coverage',
      qualifier: 'spatial',
      schema: 'dc',
    },
    {
      key: 'dc.date.accessioned',
      value: '2021-10-29T16:28:46Z',
      language: '',
      element: 'date',
      qualifier: 'accessioned',
      schema: 'dc',
    },
    {
      key: 'dc.date.available',
      value: '2021-10-29T16:28:46Z',
      language: '',
      element: 'date',
      qualifier: 'available',
      schema: 'dc',
    },
    {
      key: 'dc.date.issued',
      value: '2021',
      language: '',
      element: 'date',
      qualifier: 'issued',
      schema: 'dc',
    },
    {
      key: 'dc.identifier.citation',
      value: 'Macovei, V.A., Voynova, Y.G., Becker, M., Triest, J. and Petersen, W. (2021) Long-term intercomparison of two pCO2 instruments based on ship-of-opportunity measurements in a dynamic shelf sea environment. Limnology and Oceanography: Methods, 19, pp.37-50. DOI: https://doi.org/10.1002/lom3.10403',
      language: 'en_US',
      element: 'identifier',
      qualifier: 'citation',
      schema: 'dc',
    },
    {
      key: 'dc.identifier.uri',
      value: 'https://repository.oceanbestpractices.org/handle/11329/1766',
      language: '',
      element: 'identifier',
      qualifier: 'uri',
      schema: 'dc',
    },
    {
      key: 'dc.description.abstract',
      value: 'The partial pressure of carbon dioxide (pCO2) in surface seawater is an important biogeochemical variable\r\nbecause, together with the pCO2 in the atmosphere, it determines the direction of air–sea carbon dioxide\r\nexchange. Large-scale observations of pCO2 are facilitated by Ships-of-Opportunity (SOOP-CO2) equipped with\r\nunderway measuring instruments. The need for expanding the observation capacity and the challenges involving\r\nthe sustainability and maintenance of traditional equilibrator systems led the community toward developing\r\nsimpler and more autonomous systems. Here we performed a comparison between a membrane-based\r\nsensor and a showerhead equilibration sensor installed on two SOOP-CO2 between 2013 and 2018. We identified\r\ntime- and space-adequate crossovers in the Skagerrak Strait, where the two ship routes often crossed. We\r\nfound a mean total difference of 1.5 ± 10.6 μatm and a root mean square error of 11 μatm. The pCO2 values\r\nrecorded by the two instruments showed a strong linear correlation with a coefficient of 0.91 and a slope of\r\n1.07 (± 0.14), despite the dynamic nature of the environment and the difficulty of comparing measurements\r\nfrom two different vessels. The membrane-based sensor was integrated with a FerryBox system on a ship with a\r\nhigh sampling frequency in the study area. We showed the strength of having a sensor-based network with a\r\nhigh spatial coverage that can be validated against conventional SOOP-CO2 methods. Proving the validity of\r\nmembrane-based sensors in coastal and continental shelf seas and using the higher frequency measurements\r\nthey provide can enable a thorough characterization of pCO2 variability in these dynamic environments',
      language: 'en_US',
      element: 'description',
      qualifier: 'abstract',
      schema: 'dc',
    },
    {
      key: 'dc.language.iso',
      value: 'en',
      language: 'en_US',
      element: 'language',
      qualifier: 'iso',
      schema: 'dc',
    },
    {
      key: 'dc.rights',
      value: 'Attribution 4.0 International',
      language: '*',
      element: 'rights',
      qualifier: null,
      schema: 'dc',
    },
    {
      key: 'dc.rights.uri',
      value: 'http://creativecommons.org/licenses/by/4.0/',
      language: '*',
      element: 'rights',
      qualifier: 'uri',
      schema: 'dc',
    },
    {
      key: 'dc.subject.other',
      value: 'Ships of Opportunity',
      language: 'en_US',
      element: 'subject',
      qualifier: 'other',
      schema: 'dc',
    },
    {
      key: 'dc.subject.other',
      value: 'Voluntary ships',
      language: 'en_US',
      element: 'subject',
      qualifier: 'other',
      schema: 'dc',
    },
    {
      key: 'dc.subject.other',
      value: 'SOOP',
      language: 'en_US',
      element: 'subject',
      qualifier: 'other',
      schema: 'dc',
    },
    {
      key: 'dc.subject.other',
      value: 'FerryBox',
      language: 'en_US',
      element: 'subject',
      qualifier: 'other',
      schema: 'dc',
    },
    {
      key: 'dc.title',
      value: 'Long-term intercomparison of two pCO2 instruments.',
      language: 'en_US',
      element: 'title',
      qualifier: null,
      schema: 'dc',
    },
    {
      key: 'dc.type',
      value: 'Journal Contribution',
      language: 'en_US',
      element: 'type',
      qualifier: null,
      schema: 'dc',
    },
    {
      key: 'dc.description.refereed',
      value: 'Refereed',
      language: 'en_US',
      element: 'description',
      qualifier: 'refereed',
      schema: 'dc',
    },
    {
      key: 'dc.format.pagerange',
      value: 'pp. 37–50',
      language: 'en_US',
      element: 'format',
      qualifier: 'pagerange',
      schema: 'dc',
    },
    {
      key: 'dc.identifier.doi',
      value: '10.1002/lom3.10403',
      language: '',
      element: 'identifier',
      qualifier: 'doi',
      schema: 'dc',
    },
    {
      key: 'dc.subject.parameterDiscipline',
      value: 'Chemical oceanography',
      language: 'en_US',
      element: 'subject',
      qualifier: 'parameterDiscipline',
      schema: 'dc',
    },
    {
      key: 'dc.subject.dmProcesses',
      value: 'Data acquisition',
      language: 'en_US',
      element: 'subject',
      qualifier: 'dmProcesses',
      schema: 'dc',
    },
    {
      key: 'dc.bibliographicCitation.title',
      value: 'Limnology and Oceanography: Methods',
      language: 'en_US',
      element: 'bibliographicCitation',
      qualifier: 'title',
      schema: 'dc',
    },
    {
      key: 'dc.bibliographicCitation.volume',
      value: '19',
      language: 'en_US',
      element: 'bibliographicCitation',
      qualifier: 'volume',
      schema: 'dc',
    },
    {
      key: 'dc.description.sdg',
      value: '14.a',
      language: 'en_US',
      element: 'description',
      qualifier: 'sdg',
      schema: 'dc',
    },
    {
      key: 'dc.description.eov',
      value: 'N/A',
      language: 'en_US',
      element: 'description',
      qualifier: 'eov',
      schema: 'dc',
    },
    {
      key: 'dc.description.methodologyType',
      value: 'Method',
      language: 'en_US',
      element: 'description',
      qualifier: 'methodologyType',
      schema: 'dc',
    },
    {
      key: 'dc.description.methodologyType',
      value: 'Reports with methodological relevance',
      language: 'en_US',
      element: 'description',
      qualifier: 'methodologyType',
      schema: 'dc',
    },
    {
      key: 'obps.contact.contactname',
      value: 'Vlad Macovei',
      language: '',
      element: 'contact',
      qualifier: 'contactname',
      schema: 'obps',
    },
    {
      key: 'obps.contact.contactemail',
      value: 'vlad.macovei@hzg.de',
      language: '',
      element: 'contact',
      qualifier: 'contactemail',
      schema: 'obps',
    },
    {
      key: 'obps.resourceurl.publisher',
      value: 'https://aslopubs.onlinelibrary.wiley.com/doi/full/10.1002/lom3.10403',
      language: '',
      element: 'resourceurl',
      qualifier: 'publisher',
      schema: 'obps',
    },
  ],
};

describe('DSpaceItem', () => {
  describe('constructor', () => {
    test('should assign the given options', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      expect(dspaceItem.handle).toEqual('11329/1766');
      expect(dspaceItem.uuid).toEqual('38c7d808-aa26-4ed4-a3e4-3458b989d2d4');
    });
  });

  describe('findMetadataItems', () => {
    test('should return a list matching a single metadata item', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const [titleMetadata] = dspaceItem.findMetadataItems('dc.title');

      expect(titleMetadata.key).toEqual('dc.title');
      expect(titleMetadata.value).toEqual('Long-term intercomparison of two pCO2 instruments.');
    });

    test('should return a list matching multiple metadata items', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const authors = dspaceItem.findMetadataItems('dc.contributor.author');

      expect(authors.length).toEqual(5);
    });
  });

  describe('findBitstreamItem', () => {
    test('should return a bitstream item for the given bundle name and mime type', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const bitstreamItem = dspaceItem.findBitstreamItem('ORIGINAL', 'application/pdf');

      expect(bitstreamItem.uuid).toEqual('a7df78b6-9d29-4919-a920-c1bddf7be7b0');
    });

    test('should return undefined if no bitstream item is found', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const bitstreamItem = dspaceItem.findBitstreamItem('WHOOP THERE', 'it/is');

      expect(bitstreamItem).toBeUndefined();
    });
  });

  describe('thumbnailBitstreamItem', () => {
    test('should return the thumbnail bitstream item', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const { thumbnailBitstreamItem } = dspaceItem;

      expect(thumbnailBitstreamItem.uuid).toEqual('5940f3b4-5dd3-4230-ae4e-28b2e2b47339');
    });
  });

  describe('pdfBitstreamItem', () => {
    test('should return the pdf bitstream item', () => {
      const dspaceItem = new DSpaceItem(dspaceResponseObject);
      const { pdfBitstreamItem } = dspaceItem;

      expect(pdfBitstreamItem.uuid).toEqual('a7df78b6-9d29-4919-a920-c1bddf7be7b0');
    });
  });
});
