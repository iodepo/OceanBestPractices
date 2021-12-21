export const termsMapping = {
  mappings: {
    properties: {
      suggest: {
        type: 'completion',
      },
      label: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      query: {
        type: 'percolator',
      },
      source_terminology: {
        type: 'keyword',
      },
      namedGraphUri: {
        type: 'keyword',
      },
      uri: {
        type: 'keyword',
      },
      contents: {
        type: 'text',
      },
      title: {
        type: 'text',
      },
    },
  },
};
