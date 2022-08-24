import { SearchKeywordComps } from './search-keyword-comps';

// TODO: Improve this as we define what a SearchDocument looks like.
export type DocumentSearchQuery = Record<string, unknown>;

// TODO: These are marked as optional simply because I had to default them above. Working
// on improving all of this in small increments.
export interface DocumentSearchQueryBuilderOptions {
  from: number
  size: number
  keywordComps?: SearchKeywordComps[]
  terms?: string[]
  termURIs?: string[]
  refereed?: boolean
  endorsed?: boolean
  sort: string[]
}

/**
 * @param {Object} termPhrase
 * @returns {Object}
 */
export const nestedQuery = (termPhrase: unknown) => ({
  nested: {
    path: 'terms',
    query: {
      match: termPhrase,
    },
  },
});

// Elasticsearch's query_string query has a list of special characters. We don't
// want to necessarily escape them all (e.g. the user can use a wildcard if they want)
// but there are a few obvious ones we need to escape.
// https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html
// All special characters: + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
// Characters we currently want to escape: + - = && || ! ( ) { } [ ] : \ /
const queryStringSpecialCharacters = /\+|-|=|&{2}|\|{2}|!|\(|\)|{|}|\[|]|:|\/|\\/g;
const encodeQueryStringTerm = (term: string, field: string): string => {
  const encodedTerm = term.replace(queryStringSpecialCharacters, '\\$&');

  // FIXME: This is a hack to make doi searches work. Fix this better please.
  return field === 'dc_identifier_doi' ? `*${encodedTerm}` : encodedTerm;
};

const formatKeywordComp = (keywordComp: SearchKeywordComps) => {
  let openSearchOperator;

  switch (keywordComp.operator) {
    case '-':
      openSearchOperator = 'NOT';
      break;
    case '+':
      openSearchOperator = 'AND';
      break;
    default:
      openSearchOperator = 'OR';
  }

  const encodedKeywordCompTerm = encodeQueryStringTerm(
    keywordComp.term,
    keywordComp.field
  );
  return `${openSearchOperator} ${keywordComp.field}:(${encodedKeywordCompTerm})`;
};

/**
 * This function takes a valid keyword and formats it specifically for our Opensearch
 * query string.
 *
 * @param keywordComps
 * */
export const formatQueryString = (keywordComps: SearchKeywordComps[]): string => {
  if (keywordComps.length === 0) {
    return '*:(*)';
  }

  // Create the query string from the given keywords. Query strings can
  // not start with an operator so we remove it and any extra whitespace.
  return keywordComps.map((kc) => formatKeywordComp(kc))
    .join(' ')
    .trim()
    .replace(/^(OR|AND|NOT)\s+/, '');
};

export const buildSort = (sortParams: string[] = []) => {
  const query = sortParams.map((s) => {
    const keyAndDirection = s.split(':');
    if (keyAndDirection.length < 2) {
      return keyAndDirection[0];
    }

    const param = {};

    // @ts-expect-error This will be fixed when a test is written
    // eslint-disable-next-line prefer-destructuring
    param[keyAndDirection[0]] = keyAndDirection[1];

    return param;
  });

  query.push('_score');

  return query;
};

/**
 * Helper function that builds the `query` field of the Elasticsearch search
 * document.
 *
 * @param keywordComps An array of search keyword components.
 * @param terms An array of terms that will be used as filters in the
 * query.
 * @param termURIs A list of term URIs (ontology URIs) that can be
 * used as filters in the query.
 * @param refereed Whether or not `refereed` should be used as a
 * filter.
 * @param endorsed Whether or not to filter by a document being
 * endorsed.
 *
 * @returns The query object that can be used in an OpenSearch
 * search document `query` field.
 */
export const buildQuery = (
  keywordComps: SearchKeywordComps[] = [],
  terms: string[] = [],
  termURIs: string[] = [],
  refereed = false,
  endorsed = false
): Record<string, unknown> => {
  const boolQuery: Record<string, unknown> = {
    must: {
      query_string: {
        query: formatQueryString(keywordComps),
      },
    },
  };

  console.log(`Keywords:${JSON.stringify(keywordComps)}`);

  const filter = [];
  if (terms.length > 0 || termURIs.length > 0) {
    for (const t of terms) {
      filter.push(nestedQuery({ 'terms.label': t }));
    }

    for (const t of termURIs) {
      filter.push(nestedQuery({ 'terms.uri': t }));
    }
  }

  if (refereed) {
    filter.push({
      exists: {
        field: 'dc_description_refereed',
      },
    });
  }

  if (endorsed) {
    filter.push({
      exists: {
        field: 'obps_endorsementExternal_externalEndorsedBy',
      },
    });
  }

  if (filter.length > 0) {
    boolQuery['filter'] = filter;
  }

  const query = {
    bool: boolQuery,
  };

  console.log(JSON.stringify(query));

  return query;
};

/**
 * Builds an Elasticsearch search document object that can be used in an
 * Elasctsearch search request. Specifically, this function sets the fields to
 * include, options like from and size, and which fields should provide the
 * highlight information. It also builds the query string value based on
 * keywords provided in the `options` argument.
 *
 * @param options Search options to include in the search
 * document. At a minimum this object should contain a from, size, keywords,
 * terms | termsURI, and whether or not `refereed` should be checked.
 *
 * @returns A search document object that can be used directly by an OpenSearch search
 * request.
 */
export const buildDocumentSearchQuery = (
  options: DocumentSearchQueryBuilderOptions
): DocumentSearchQuery => {
  const searchDoc: DocumentSearchQuery = {
    _source: {
      excludes: [
        'bitstreamText',
        'bitstreams',
        'metadata',
      ],
    },
    from: options.from,
    size: options.size,
    query: buildQuery(
      options.keywordComps,
      options.terms,
      options.termURIs,
      options.refereed,
      options.endorsed
    ),
    highlight: {
      fields: {
        bitstreamText: {},
      },
    },
    sort: buildSort(options.sort),
  };

  console.log(`Search document: ${JSON.stringify(searchDoc)}`);

  return searchDoc;
};
