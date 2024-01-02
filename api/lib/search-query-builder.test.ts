/* eslint-disable no-underscore-dangle */
import {
  buildDocumentSearchQuery,
  formatQueryString,
} from './search-query-builder';

describe('search-document-builder', () => {
  describe('buildDocumentSearchQuery', () => {
    test('should build a full search document', () => {
      const options = {
        keywordComps: [
          {
            operator: '',
            field: '*',
            term: 'ocean',
          },
          {
            operator: '',
            field: 'title',
            term: 'sea',
          },
        ],
        terms: ['alpha'],
        termURIs: ['uri://alpha'],
        from: 0,
        size: 20,
        refereed: true,
        endorsed: true,
        sort: ['title:asc'],
      };

      const result = buildDocumentSearchQuery(options);
      expect(result).toEqual({
        from: 0,
        size: 20,
        query: {
          bool: {
            must: {
              query_string: {
                query: '*:(ocean) OR title:(sea)',
              },
            },
            filter: [
              {
                nested: {
                  path: 'terms',
                  query: {
                    match: {
                      'terms.label': 'alpha',
                    },
                  },
                },
              },
              {
                nested: {
                  path: 'terms',
                  query: {
                    match: {
                      'terms.uri': 'uri://alpha',
                    },
                  },
                },
              },
              {
                exists: {
                  field: 'dc_description_refereed',
                },
              },
              {
                exists: {
                  field: 'obps_endorsementExternal_externalEndorsedBy',
                },
              },
            ],
          },
        },
        highlight: {
          fields: {
            bitstreamText: {},
          },
        },
        sort: [
          {
            title: 'asc',
          },
          '_score',
        ],
        _source: {
          excludes: [
            'bitstreamText',
            'bitstreams',
            'metadata',
          ],
        },
      });
    });
  });

  describe('formatQueryString', () => {
    test('should return a wildcard field and wildcard term for an empty keywords list', () => {
      expect(formatQueryString([])).toEqual('*:(*)');
    });

    test('should transform an OR, NOT, and AND field and term into a query string', () => {
      const keywordComps = [
        {
          operator: '',
          field: '*',
          term: 'or term',
        },
        {
          operator: '-',
          field: 'title',
          term: 'not term',
        },
        {
          operator: '+',
          field: 'title',
          term: 'and term',
        },
      ];
      const result = formatQueryString(keywordComps);

      expect(result).toEqual('*:(or term) NOT title:(not term) AND title:(and term)');
    });

    test('should build a targeted wildcard field for dc_title', () => {
      const keywordComps = [
        {
          operator: '',
          field: 'dc_title',
          term: 'this is a title and an alternative title',
        },
      ];
      const result = formatQueryString(keywordComps);

      expect(result).toEqual('dc_title\\*:(this is a title and an alternative title)');
    });

    test('should build a targeted wildcard field for dc_contributor', () => {
      const keywordComps = [
        {
          operator: '',
          field: 'dc_contributor',
          term: 'search all authors',
        },
      ];
      const result = formatQueryString(keywordComps);

      expect(result).toEqual('dc_contributor\\*:(search all authors)');
    });

    test.todo('should boost the dc_title keyword field if searching all fields');

    test.todo('should boost the dc_description_abstract field if searching all fields');

    describe('when escaping query string special characters', () => {
      // + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
      test('should escape + in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a + in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\+ in it)');
      });

      test('should escape - in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a - in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\- in it)');
      });

      test('should escape = in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a = in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\= in it)');
      });

      test('should escape && in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a && in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\&& in it)');
      });

      test('should escape || in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a || in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\|| in it)');
      });

      test('should escape ! in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a ! in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\! in it)');
      });

      test('should escape ( and ) in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a ( and ) in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\( and \\) in it)');
      });

      test('should escape { and } in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a { and } in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\{ and \\} in it)');
      });

      test('should escape [ and ] in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a [ and ] in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\[ and \\] in it)');
      });

      test('should escape : in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a : in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\: in it)');
      });

      test('should escape / in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a / in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\/ in it)');
      });

      test('should escape \\ in the query string term component', () => {
        const keywordComps = [
          {
            operator: '',
            field: '*',
            term: 'term with a \\ in it',
          },
        ];

        const result = formatQueryString(keywordComps);
        expect(result).toEqual('*:(term with a \\\\ in it)');
      });
    });
  });
});
