const AWS = require('aws-sdk');

const creds = new AWS.EnvironmentCredentials('AWS');
const region = process.env.REGION || 'us-east-1';

const http = require('http');

const esOpts = {
  host: process.env.ELASTIC_SEARCH_HOST,
  path: '/documents/_search',
};

const esEndpoint = new AWS.Endpoint(esOpts.host);

const ontOpts = {
  host: process.env.ONTOLOGY_STORE_HOST,
  port: process.env.ONTOLOGY_STORE_PORT,
  path: '/sparql',
};

const DEFAULT_FROM = 0; const
  DEFAULT_SIZE = 20;

/**
 * This function is responsible for handling a keyword search and returning
 * matching documents.
 */
exports.handler = (event, context, callback) => {
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

          executeSearch(opts, callback);
        }).catch((error) => {
          callback(error, {
            statusCode: 500,
            body: JSON.stringify({ err: error }),
            headers: responseHeaders(),
          });
        });
    } else {
      executeSearch(opts, callback);
    }
  }
};

/**
 * Executes an Elasticsearch query with the given search options and notifies
 * the callback function when it completes. The callback function should be the
 * function that ends this Lambda function, so most likely passed directly from
 * the handler.
 *
 * @param {object} options An object defining the search options to use when
 * building the search query.
 * @param {function} callback The function to use as a callback when this
 * asynchronous function finishes.
 */
function executeSearch(options, callback) {
  const searchBody = JSON.stringify(getSearchDocument(options));

  const req = getRequest(searchBody);

  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, (httpResp) => {
    let body = '';
    httpResp.on('data', (chunk) => {
      body += chunk;
    });

    httpResp.on('error', (err) => {
      callback(err, {
        statusCode: 500,
        body: JSON.stringify({ err }),
        headers: responseHeaders(),
      });
    });

    httpResp.on('end', (chunk) => {
      callback(null, {
        statusCode: 200,
        body,
        headers: responseHeaders(),
      });
    });
  }, (err) => {
    callback(err, {
      statusCode: 500,
      body: JSON.stringify({ err }),
      headers: responseHeaders(),
    });
  });
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
    terms: params.term === undefined ? [] : params.term.split(','),
    termURIs: params.termURI === undefined ? [] : params.termURI.split(','),
    from: params.from === undefined ? DEFAULT_FROM : params.from,
    size: params.size === undefined ? DEFAULT_SIZE : params.size,
    sort: params.sort === undefined ? [] : params.sort.split(','),
    fields: params.fields === undefined ? queryFields() : params.fields.split(','),
    synonyms: params.synonyms === undefined ? false : params.synonyms,
    refereed: params.refereed === undefined ? false : params.refereed,
  };
}

/**
 * Builds an HTTP request taht can be used in an Elasticsearch query.
 * @param {object} body The body of the HTTP request. Ideally this contains the
 * Elasticsearch search document.
 */
function getRequest(body) {
  const req = new AWS.HttpRequest(esEndpoint);
  req.method = 'POST';
  req.path = esOpts.path;
  req.body = body;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers['Host'] = esEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

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
 * @returns {object} A search document object that can be used directly by an
 * Elasticsearch search request.
 */
function getSearchDocument(opts) {
  const searchDoc = {
    _source: {
      excludes: ['_bitstreamText'],
    },
    from: opts.from,
    size: opts.size,
    query: buildElasticsearchQuery(opts.keywords, opts.terms, opts.termURIs, opts.fields, opts.refereed),
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
 * This function takes a valid keyword string and formats it specifically for
 * our Elasticsearch query. It's responsible for parsing logical operators and
 * inserting/removing any necessary or unnecessary quotes.
 *
 * e.g. "+ocean current" becomes "AND \"ocean current\""
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
 * Helper function that builds the `query` field of the Elasticsearch search
 * document.
 *
 * @param {array} keywords An array of search keywords.
 * @param {array} terms An array of terms that will be used as filters in the
 * query.
 * @param {array} termURIs A list of term URIs (ontology URIs) that can be
 * used as filters in the query.
 * @param {array} fields An array of field names to be searched against by the
 * query.
 * @param {boolean} refereed Whether or not `refereed` should be used as a
 * filter.
 *
 * @returns {object} The query object that can be used in an Elasticsearch
 * search document `query` field.
 */
function buildElasticsearchQuery(keywords, terms, termURIs, fields, refereed) {
  const boolQuery = {
    must: {
      query_string: {
        fields,
        query: keywords.length > 0 ? keywords.map(formatKeyword).join(' ') : '*',
      },
    },
  };

  console.log(`Keywords:${JSON.stringify(keywords)}`);

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
    filter.push({ term: { refereed: 'Refereed' } });
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

/**
 * Returns the list of fields that should be targeted in an Elasticsearch query.
 * All fields are set to the default Elasticsearch boost value unless otherwise
 * denoted by ^n.
 *
 * @returns {array} Array of field names to target in a query
 */
function queryFields() {
  return [
    '_bitstreamText',
    'dc_title^2',
    'dc_publisher',
    'dc_contributor_author',
    'dc_title_alternative',
    'dc_contributor_corpauthor',
    'dc_contributor_editor',
    'dc_bibliographicCitation_title',
    'dc_description_eov',
    'dc_description_sdg',
    'dc_description_refereed',
    'dc_description_abstract^2',
    'dc_description_status',
    'dc_description_currentstatus',
    'dc_relation_uri',
    'dc_language_iso',
    'dc_description_bptype',
    'dc_relation_ispartofseries',
    'dc_type',
    'dc_subject_other',
    'dc_subject_instrumentType',
    'dc_subject_parameterDiscipline',
    'dc_subject_dmProcesses',
    'dc_identifier_orcid',
    'dc_identifier_doi',
    'dc_description_maturitylevel',
    'dc_description_notes',
    'dc_coverage_spatial',
    'dc_description_ecv',
    'dc_description_ebv',
  ];
}

function nestedQuery(termPhrase) {
  return {
    nested: {
      path: 'terms',
      query: {
        bool: {
          must: {
            match_phrase: termPhrase,
          },
        },
      },
    },
  };
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
      http.get(buildSynonymsQueryOpts(buildSynonymsQuery(k)), (res) => {
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

function responseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
}
