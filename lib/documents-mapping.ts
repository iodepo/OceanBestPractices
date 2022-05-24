export const documentsMapping = {
  mappings: {
    date_detection: false,
    properties: {
      bitstreamTextKey: {
        type: 'keyword',
      },
      bitstreamText: {
        type: 'text',
      },
      primaryAuthor: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      terms: {
        type: 'nested',
        properties: {
          uri: {
            type: 'keyword',
          },
          label: {
            type: 'text',
          },
          source_terminology: {
            type: 'keyword',
          },
          namedGraphUri: {
            type: 'keyword',
          },
        },
      },
      thumbnailRetrieveLink: {
        type: 'keyword',
      },
      bitstreams: {
        type: 'nested',
        dynamic: true,
      },
      handle: {
        type: 'keyword',
      },
      lastModified: {
        type: 'date',
        format: 'yyyy-MM-dd H:m:s.SSS',
      },
      metadata: {
        type: 'nested',
        properties: {
          value: {
            type: 'keyword',
          },
        },
      },
      uuid: {
        type: 'keyword',
      },
      dc_abstract: {
        type: 'text',
      },
      dc_date_issued: {
        type: 'date',
        format: 'yyyy',
      },
      dc_description_notes: {
        type: 'text',
      },
      dc_title: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      dc_title_alternative: {
        type: 'text',
      },
    },
  },
};
