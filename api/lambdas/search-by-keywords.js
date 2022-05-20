const https = require('https');
const { getStringFromEnv } = require('../../lib/env-utils');
const osClient = require('../../lib/open-search-client');

const { defaultSearchFields } = require('../lib/search-fields');

const ontOpts = {
  host: process.env['ONTOLOGY_STORE_HOST'],
  port: process.env['ONTOLOGY_STORE_PORT'],
  path: '/sparql',
};

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;

function responseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * This function is responsible for handling a keyword search and returning
 * matching documents.
 */
exports.handler = (event, context, callback) => {
  const documentsIndexName = getStringFromEnv('DOCUMENTS_INDEX_NAME');
  const openSearchEndpoint = getStringFromEnv('OPEN_SEARCH_ENDPOINT');

  const params = event.queryStringParameters;

  if (params === undefined || params === null) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({}),
      headers: responseHeaders(),
    });
  } else if (params.keywords === undefined || params.keywords === null) {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({}),
      headers: responseHeaders(),
    });
  } else {
    const opts = parseParams(params);
    if (opts.synonyms) {
      getSynonyms(opts.keywords, callback)
        .then((results) => {
          let keywords = [opts.keywords].flat();
          for (const r of results) { keywords = keywords.concat(r); }
          opts.keywords = keywords;

          executeSearch(openSearchEndpoint, documentsIndexName, opts)
            .then((searchResults) => {
              const response = {
                statusCode: 200,
                body: JSON.stringify(searchResults),
                headers: responseHeaders(),
              };

              callback(null, response);
            });
        }).catch((error) => {
          callback(error, {
            statusCode: 500,
            body: JSON.stringify({ err: error }),
            headers: responseHeaders(),
          });
        });
    } else {
      executeSearch(openSearchEndpoint, documentsIndexName, opts)
        .then((searchResults) => {
          const response = {
            statusCode: 200,
            body: JSON.stringify(searchResults),
            headers: responseHeaders(),
          };

          callback(null, response);
        });
    }
  }
};

/**
 * Builds an Elasticsearch search document object that can be used in an
 * Elasctsearch search request. Specifically, this function sets the fields to
 * include, options like from and size, and which fields should provide the
 * highlight information. It also builds the query string value based on
 * keywords provided in the `opts` argument.
 *
 * @param {object} opts Search options to include in the search document. At a
 * minimum this object should contain a from, size, keywords, terms | termsURI,
 * fields, and whether or not `refereed` should be checked.
 *
 * @returns {Record<string, unknown>} A search document object that can be
 * used directly by an Elasticsearch search request.
 */
function getSearchDocument(opts) {
  const searchDoc = {
    _source: {
      excludes: ['_bitstreamText', 'bitstreams', 'metadata'],
    },
    from: opts.from,
    size: opts.size,
    query: buildElasticsearchQuery(
      opts.keywords,
      opts.terms,
      opts.termURIs,
      opts.fields,
      opts.refereed,
      opts.endorsed
    ),
    highlight: {
      fields: {
        _bitstreamText: {},
      },
    },
    sort: sortQuery(opts.sort),
  };

  console.log(`Search document: ${JSON.stringify(searchDoc)}`);

  return searchDoc;
}

/**
 * Executes an Elasticsearch query with the given search options and notifies
 * the callback function when it completes. The callback function should be the
 * function that ends this Lambda function, so most likely passed directly from
 * the handler.
 *
 * @param {string} openSearchEndpoint
 * @param {string} documentsIndexName
 * @param {Object} options An object defining the search options to use when
 * building the search query.
 */
function executeSearch(openSearchEndpoint, documentsIndexName, options) {
  const searchBody = getSearchDocument(options);

  return osClient.searchByQuery(
    openSearchEndpoint,
    documentsIndexName,
    searchBody
  );
}

/**
 * Parses the event parameters to define search related parameters and default
 * values.
 *
 * @param {object} params The parameters provided when invoking the search
 * function.
 *
 * @returns {object} An object containing the parsed parameters.
 */
function parseParams(params) {
  return {
    keywords: params.keywords !== undefined && params.keywords.length > 0 ? params.keywords.split(',') : [],
    // TODO: Rename this parameter to be plural.
    terms: params.term === undefined ? [] : params.term.split(','),
    // TODO: Rename this parameter to be plural.
    termURIs: params.termURI === undefined ? [] : params.termURI.split(','),
    from: params.from === undefined ? DEFAULT_FROM : params.from,
    size: params.size === undefined ? DEFAULT_SIZE : params.size,
    sort: params.sort === undefined ? [] : params.sort.split(','),
    fields: params.fields === undefined ? defaultSearchFields : params.fields.split(','),
    synonyms: params.synonyms === undefined ? false : params.synonyms,
    refereed: params.refereed === undefined ? false : params.refereed,
    endorsed: params.endorsed === 'true',
  };
}

/**
 * This function takes a valid keyword string and formats it specifically for
 * our Elasticsearch query. It's responsible for parsing logical operators and
 * inserting/removing any necessary or unnecessary quotes.
 *
 * e.g. "+ocean current" becomes "AND \"ocean current\""
 *
 * @param {string} k
 * */
function formatKeyword(k) {
  // Map the UI operators to ES operators.
  const opTransforms = {
    '+': 'AND',
    '-': 'NOT',
  };

  // Extract the operator from the keyword.
  let op = ''; let
    fk = k;
  if (Object.keys(opTransforms).includes(fk.slice(0, 1))) {
    op = opTransforms[fk.slice(0, 1)];
    fk = fk.substring(1, fk.length);
  }

  // Strip all double quotes from the keyword since we're
  // performing a quoted query in ES.
  fk = fk.replace(/"/g, '');

  // Optional: try splitting the search term on a space. If it's a multi-
  // word search term we'll append each term as OR'd AND searches.
  const fk_comps = fk.split(' ');
  const opt_t = fk_comps.map((t) => `\"${t}\"`);

  console.log(`opt_t:\n${JSON.stringify(opt_t)}`);

  // Construct the query for the primary keyword.
  fk = `${op} "${fk}"`;

  // It's a multi-word keyword. Append a grouped AND for each word in the term
  // and boost the original keyword.
  if (opt_t.length > 1) {
    fk = `${fk}^2 OR ( ${opt_t.join(' AND ')} )`;
  }

  return fk;
}

/**
 * @param {Object} termPhrase
 * @returns {Object}
 */
function nestedQuery(termPhrase) {
  return {
    nested: {
      path: '_terms',
      query: {
        match: termPhrase,
      },
    },
  };
}

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
function buildElasticsearchQuery(
  keywords,
  terms,
  termURIs,
  fields,
  refereed,
  endorsed
) {
  const boolQuery = {
    must: {
      query_string: {
        fields,
        query: keywords.length > 0
          ? keywords.map((k) => formatKeyword(k)).join(' ')
          : '*',
      },
    },
  };

  console.log(`Keywords: ${JSON.stringify(keywords)}`);

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
}

function sortQuery(sortParams) {
  const query = sortParams.map((s) => {
    const keyAndDirection = s.split(':');
    if (keyAndDirection.length < 2) {
      return keyAndDirection[0];
    }
    const param = {};
    param[keyAndDirection[0]] = keyAndDirection[1];

    return param;
  });

  query.push('_score');

  return query;
}

function buildSynonymsQuery(term) {
  const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
               PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
               PREFIX owl: <http://www.w3.org/2002/07/owl#> \
               PREFIX skos:<http://www.w3.org/2004/02/skos/core#> \
               SELECT DISTINCT ?annotatedTarget ?annotatedPropertyLabel ?sameAsLabel \
               WHERE { \
                { \
                  ?nodeID owl:annotatedSource ?xs . \
                  ?nodeID owl:annotatedProperty ?annotatedProperty . \
                  ?nodeID owl:annotatedTarget ?annotatedTarget . \
                  ?nodeID ?aaProperty ?aaPropertyTarget . \
                  OPTIONAL {?annotatedProperty rdfs:label ?annotatedPropertyLabel} . \
                  OPTIONAL {?aaProperty rdfs:label ?aaPropertyLabel} . \
                  FILTER ( isLiteral( ?annotatedTarget ) ) . \
                  FILTER ( ?aaProperty NOT IN ( owl:annotatedSource, rdf:type, owl:annotatedProperty, owl:annotatedTarget ) ) \
                  { \
                    SELECT DISTINCT ?xs WHERE { \
                      ?xs rdfs:label ?xl . \
                      FILTER (?xl = '${term}'^^xsd:string) \
                    } \
                  }\
                } \
                UNION \
                { \
                  SELECT ?sameAsLabel \
                  WHERE { \
                    ?concept skos:prefLabel ?prefLabel . \
                    FILTER (str(?prefLabel) = '${term}') \
                    ?concept owl:sameAs ?sameAsConcept . \
                    ?sameAsConcept skos:prefLabel ?sameAsLabel . \
                  } \
                } \
              }`;

  return query;
}

function buildSynonymsQueryOpts(query) {
  return {
    hostname: ontOpts.host,
    path: `${ontOpts.path}?query=${encodeURIComponent(query)}`,
    port: ontOpts.port,
    headers: {
      Accept: 'application/json',
    },
  };
}

function getSynonyms(keywords) {
  const promises = [];
  for (const k of keywords) {
    const queryPromise = new Promise((resolve, reject) => {
      https.get(buildSynonymsQueryOpts(buildSynonymsQuery(k)), (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', () => {
          const synonyms = parseSynonymsResponse(JSON.parse(body));
          resolve(synonyms);
        });
      });
    });

    promises.push(queryPromise);
  }

  return Promise.all(promises);
}

function parseSynonymsResponse(body) {
  const results = body.results.bindings; const
    synonyms = [];
  console.log(JSON.stringify(body));
  for (const r of results) {
    if (r['annotatedPropertyLabel'] !== undefined) {
      if (r['annotatedPropertyLabel']['value'] === 'has_exact_synonym' || r['annotatedPropertyLabel']['value'] === 'alternative_label') {
        synonyms.push(r['annotatedTarget']['value']);
      }
    } else if (r['sameAsLabel'] !== undefined) {
      synonyms.push(r['sameAsLabel']['value']);
    }
  }

  return synonyms;
}
