const https = require('https');
const { getStringFromEnv } = require('../../lib/env-utils');
const osClient = require('../../lib/open-search-client');
const { buildDocumentSearchQuery } = require('../lib/search-query-builder');

const { parseSearchKeyword } = require('../lib/search-keyword-comps');

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
      // TODO: Synonyms doesn't really work. We also want to make sure
      // that synonyms get the same field and operator as the originating keyword.
      // https://github.com/iodepo/OceanBestPractices/issues/197
      getSynonyms(opts.keywordComps, callback)
        .then((results) => {
          const keywords = [opts.keywords].flat();
          for (const r of results) {
            opts.keywordComps = [
              {
                operator: '',
                field: '*',
                term: r,
              },
              ...opts.keywords,
            ];
          }

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
 * Executes an Elasticsearch query with the given search options and notifies
 * the callback function when it completes. The callback function should be the
 * function that ends this Lambda function, so most likely passed directly from
 * the handler.
 *
 * @param {string} openSearchEndpoint
 * @param {string} documentsIndexName
 * @param {import('../lib/search-query-builder')
 *  .DocumentSearchQueryBuilderOptions} options
 * An object defining the search options to use when building the search query.
 */
function executeSearch(openSearchEndpoint, documentsIndexName, options) {
  const searchBody = buildDocumentSearchQuery(options);

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
    keywordComps: params.keywords !== undefined && params.keywords.length > 0
      ? params.keywords.split(',').map((k) => parseSearchKeyword(k))
      : [],
    // TODO: Rename this parameter to be plural.
    terms: params.term === undefined ? [] : params.term.split(','),
    // TODO: Rename this parameter to be plural.
    termURIs: params.termURI === undefined ? [] : params.termURI.split(','),
    from: params.from === undefined ? DEFAULT_FROM : params.from,
    size: params.size === undefined ? DEFAULT_SIZE : params.size,
    sort: params.sort === undefined ? [] : params.sort.split(','),
    synonyms: params.synonyms === undefined ? false : params.synonyms,
    refereed: params.refereed === undefined ? false : params.refereed,
    endorsed: params.endorsed === 'true',
  };
}

/**
 *
 * @param {string} term
 * @returns
 */
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

/**
 *
 * @param {string} query
 * @returns
 */
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

/**
 *
 * @param {{ results: { bindings: any }}} body
 * @returns
 */
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

/**
 *
 * @param {import('../lib/search-keyword-comps').SearchKeywordComps[]} keywordComps
 * @returns
 */
function getSynonyms(keywordComps) {
  const promises = [];
  for (const kc of keywordComps) {
    const queryPromise = new Promise((resolve, reject) => {
      https.get(buildSynonymsQueryOpts(buildSynonymsQuery(kc.term)), (res) => {
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
