/**
 * @param {Object} termPhrase
 * @returns {Object}
 */
export const nestedQuery = (termPhrase: unknown) => ({
  nested: {
    path: '_terms',
    query: {
      match: termPhrase,
    },
  },
});

/**
 * This function takes a valid keyword string and formats it specifically for
 * our Elasticsearch query. It's responsible for parsing logical operators and
 * inserting/removing any necessary or unnecessary quotes.
 *
 * e.g. "+ocean current" becomes "AND \"ocean current\""
 *
 * @param {string} k
 * */
export const formatKeyword = (k: string) => {
  // Map the UI operators to ES operators.
  const opTransforms: Record<string, string> = {
    '+': 'AND',
    '-': 'NOT',
  };

  // Extract the operator from the keyword.
  let op = '';
  let fk = k;
  if (Object.keys(opTransforms).includes(fk.slice(0, 1))) {
    op = opTransforms[fk.slice(0, 1)] || '';
    fk = fk.slice(1, fk.length);
  }

  // Strip all double quotes from the keyword since we're
  // performing a quoted query in ES.
  fk = fk.replace(/"/g, '');

  // Optional: try splitting the search term on a space. If it's a multi-
  // word search term we'll append each term as OR'd AND searches.
  const fkComps = fk.split(' ');

  // Need to determine what this escaped value should look like.

  // eslint-disable-next-line no-useless-escape
  const optT = fkComps.map((t) => `\"${t}\"`);

  console.log(`optT:\n${JSON.stringify(optT)}`);

  // Construct the query for the primary keyword.
  fk = `${op} "${fk}"`;

  // It's a multi-word keyword. Append a grouped AND for each word in the term
  // and boost the original keyword.
  if (optT.length > 1) {
    fk = `${fk}^2 OR ( ${optT.join(' AND ')} )`;
  }

  return fk;
};

export const sortQuery = (sortParams: string[] = []) => {
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
 * @param {string[]} keywords An array of search keywords.
 * @param {string[]} terms An array of terms that will be used as filters in the
 * query.
 * @param {string[]} termURIs A list of term URIs (ontology URIs) that can be
 * used as filters in the query.
 * @param {string[]} fields An array of field names to be searched against by
 * the query.
 * @param {boolean} refereed Whether or not `refereed` should be used as a
 * filter.
 * @param {boolean} endorsed Whether or not to filter by a document being
 * endorsed.
 *
 * @returns {Object} The query object that can be used in an Elasticsearch
 * search document `query` field.
 */
export const buildElasticsearchQuery = (
  keywords: string[] = [],
  terms: string[] = [],
  termURIs: string[] = [],
  fields: string[] = [],
  refereed = false,
  endorsed = false
) => {
  const boolQuery: Record<string, unknown> = {
    must: {
      query_string: {
        fields,
        query: keywords.length > 0
          ? keywords.map((k) => formatKeyword(k)).join(' ')
          : '*',
      },
    },
  };

  console.log(`Keywords:${JSON.stringify(keywords)}`);

  const filter = [];
  if (terms.length > 0 || termURIs.length > 0) {
    for (const t of terms) {
      filter.push(nestedQuery({ '_terms.label': t }));
    }

    for (const t of termURIs) {
      filter.push(nestedQuery({ '_terms.uri': t }));
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

// TODO: These are marked as optional simply because I had to default them above. Working
// on improving all of this in small increments.
export interface SearchDocumentBuilderOptions {
  from: number
  size: number
  keywords?: string[]
  terms?: string[]
  termURIs?: string[]
  fields?: string[]
  refereed?: boolean
  endorsed?: boolean
  sort: string[]
}

/**
 * Builds an Elasticsearch search document object that can be used in an
 * Elasctsearch search request. Specifically, this function sets the fields to
 * include, options like from and size, and which fields should provide the
 * highlight information. It also builds the query string value based on
 * keywords provided in the `opts` argument.
 *
 * @param {SearchDocumentBuilderOptions} options Search options to include in the search
 * document. At a minimum this object should contain a from, size, keywords,
 * terms | termsURI, fields, and whether or not `refereed` should be checked.
 *
 * @returns {Record<string, unknown>} A search document object that can be
 * used directly by an Elasticsearch search request.
 */
export const buildSearchDocument = (options: SearchDocumentBuilderOptions) => {
  const searchDoc = {
    _source: {
      excludes: ['_bitstreamText', 'bitstreams', 'metadata'],
    },
    from: options.from,
    size: options.size,
    query: buildElasticsearchQuery(
      options.keywords,
      options.terms,
      options.termURIs,
      options.fields,
      options.refereed,
      options.endorsed
    ),
    highlight: {
      fields: {
        _bitstreamText: {},
      },
    },
    sort: sortQuery(options.sort),
  };

  console.log(`Search document: ${JSON.stringify(searchDoc)}`);

  return searchDoc;
};
