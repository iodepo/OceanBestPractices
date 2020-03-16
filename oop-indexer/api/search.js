'use strict';

const AWS = require('aws-sdk');
const region = process.env.REGION || 'us-east-1';
const http = require('http');

const esOpts = {
  host: process.env.ELASTIC_SEARCH_HOST,
  path: "/documents/_search",
};

const esEndpoint = new AWS.Endpoint(esOpts.host);
const creds = new AWS.EnvironmentCredentials('AWS');

const ontOpts = {
  host: process.env.ONTOLOGY_STORE_HOST,
  port: process.env.ONTOLOGY_STORE_PORT,
  path: "/sparql",
};

const DEFAULT_FROM = 0, DEFAULT_SIZE = 20;

exports.handler = (event, context, callback) => {
  const params = event.queryStringParameters;
  
  if (params === undefined || params === null) {
    callback(null, { statusCode: 200, body: JSON.stringify({}), headers: responseHeaders() });
  } else if (params.keywords === undefined || params.keywords === null) {
    callback(null, { statusCode: 200, body: JSON.stringify({}), headers: responseHeaders() });
  } else {
    var opts = parseParams(params);

    if (opts.synonyms) {
      getSynonyms(opts.keywords, callback)
        .then(function(results) {
          var keywords = [].concat(opts.keywords);
          results.forEach(function(r) { keywords = keywords.concat(r); });
          opts.keywords = keywords;
          
          executeSearch(opts, callback);
        }).catch(function(err) {
          callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });          
        }); 
    } else {
      executeSearch(opts, callback);  
    }
  }
};

function executeSearch(options, callback) {
  const searchBody = JSON.stringify(getSearchDocument(options));
  
  const req = getRequest(searchBody);

  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, function(httpResp) {
    var body = '';
    httpResp.on('data', function(chunk) {
      body += chunk;
    });

    httpResp.on('error', function(err) {
      callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });  
    });

    httpResp.on('end', function(chunk) {
      callback(null, { statusCode: 200, body: body, headers: responseHeaders() });
    });
  }, function(err) {
    callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });
  });
}

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
    refereed: params.refereed === undefined ? false : params.refereed
  }
}

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

function getSearchDocument(opts) {
  const searchDoc = {
      "_source": {
        "excludes": ["contents"]
      },
      "from": opts.from,
      "size": opts.size,
      "query": buildElasticsearchQuery(opts.keywords, opts.terms, opts.termURIs, opts.fields, opts.refereed),
      "highlight": {
        "fields": {
          "contents": {}
        }
      },
      "sort": sortQuery(opts.sort),
    };

  console.log("Search document: " + JSON.stringify(searchDoc));

  return searchDoc;
}

/**
 * This function takes a valid keyword string and formats it specifically for our
 * Elasticsearch query. It's responsible for parsing logical operators and inserting/removing
 * any necessary or unnecessary quotes.
 * 
 * e.g. "+ocean current" becomes "AND \"ocean current\""
 **/
function formatKeyword(k, i) {
  // Map the UI operators to ES operators.
  const opTransforms = { "+": "AND", "-": "NOT" };
  
  // Extract the operator from the keyword.
  var op = '', fk = k;
  if (Object.keys(opTransforms).includes(fk.substring(0,1))) {
    op = opTransforms[fk.substring(0, 1)];
    fk = fk.substring(1, fk.length);
  }
  
  // Strip all double quotes from the keyword since we're
  // performing a quoted query in ES.
  fk = fk.replace(/["]/g, "");
  
  return i > 0 ? op + " \"" + fk + "\"" : "\"" + fk + "\"";
}

function buildElasticsearchQuery(keywords, terms, termURIs, fields, refereed) {
  var boolQuery = {
    "must": {
      "query_string": {
        "fields": fields,
        "query": keywords.length > 0 ? keywords.map(formatKeyword).join(" ") : "*"
      }
    }
  };
  
  console.log("Keywords:" + JSON.stringify(keywords));

  var filter = [];
  if (terms.length || termURIs.length) {
    terms.forEach((t) => {
      filter.push(nestedQuery({ "terms.label": t }));
    });

    termURIs.forEach((t) => {
      filter.push(nestedQuery({ "terms.uri": t }));
    });
  }

  if (refereed) {
    filter.push({ "term": { "refereed": "Refereed" } });
  }

  if (filter.length > 0) {
    boolQuery["filter"] = filter;  
  }
  
  var query = {
    "bool": boolQuery
  };
  
  console.log(JSON.stringify(query));
  
  return query;
}

/**
 * Returns the list of fields that should be targeted in an Elasticsearch query. All fields
 * are set to the default Elasticsearch boost value unless otherwise denoted by ^n.
 * 
 * @returns {array} Array of field names to target in a query
 */
function queryFields() {
  return [
          "contents", 
          "title^2", 
          "publisher", 
          "author", 
          "title_alt", 
          "corp_author", 
          "editor", 
          "journal_title", 
          "essential_ocean_variables", 
          "sustainable_development_goals", 
          "refereed",
          "abstract^2",
          "publication_status",
          "current_status",
          "relation_uri",
          "language",
          "bptype",
          "relation_is_part_of_series",
          "type",
          "subjects_other",
          "subjects_instrument_type",
          "subjects_parameter_discipline",
          "subjects_dm_processes",
          "identifier_orcid",
          "identifier_doi",
          "maturity_level",
          "notes",
          "coverage_spatial"
         ];
}

function nestedQuery(termPhrase) {
  return {
    "nested": {
      "path": "terms",
      "query": {
        "bool": {
          "must": {
            "match_phrase": termPhrase
          }
        }
      }
    }
  };
}

function sortQuery(sortParams) {
  var query = sortParams.map((s) => {
    const keyAndDirection = s.split(':');
    if (keyAndDirection.length < 2) {
      return keyAndDirection[0];
    } else {
      var param = {};
      param[keyAndDirection[0]] = keyAndDirection[1];
      
      return param;
    }
  });

  query.push("_score");

  return query;
}

function buildSynonymsQuery(term) {
  var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
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
                      FILTER (?xl = '" + term + "'^^xsd:string) \
                    } \
                  }\
                } \
                UNION \
                { \
                  SELECT ?sameAsLabel \
                  WHERE { \
                    ?concept skos:prefLabel ?prefLabel . \
                    FILTER (str(?prefLabel) = '" + term + "') \
                    ?concept owl:sameAs ?sameAsConcept . \
                    ?sameAsConcept skos:prefLabel ?sameAsLabel . \
                  } \
                } \
              }";

  return query;
}

function buildSynonymsQueryOpts(query) {
  return {
    hostname: ontOpts.host,
    path: ontOpts.path + "?query=" + encodeURIComponent(query),
    port: ontOpts.port,
    headers: {
      'Accept': 'application/json'
    }
  };
}

function getSynonyms(keywords) {
  var promises = [];
  keywords.forEach(function(k) {
      const queryPromise = new Promise(function (resolve, reject) {
        http.get(buildSynonymsQueryOpts(buildSynonymsQuery(k)), function(res) {
        var body = '';

        res.on('data', function(chunk) {
          body += chunk;
        });

        res.on('error', function(err) {
          reject(err);
        });

        res.on('end', function() {
          const synonyms = parseSynonymsResponse(JSON.parse(body));
          resolve(synonyms);
        });
      });
    });

    promises.push(queryPromise);
  });

  return Promise.all(promises);
}

function parseSynonymsResponse(body) {
  var results = body.results.bindings, synonyms = [];
  console.log(JSON.stringify(body));
  results.forEach(function(r) {
    if (r["annotatedPropertyLabel"] !== undefined) {
      if (r["annotatedPropertyLabel"]["value"] === "has_exact_synonym" || r["annotatedPropertyLabel"]["value"] === "alternative_label") {
        synonyms.push(r["annotatedTarget"]["value"]);
      }
    } else if (r["sameAsLabel"] !== undefined) {
      synonyms.push(r["sameAsLabel"]["value"]);
    }
  });

  return synonyms;
}

function responseHeaders() {
  return { 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Credentials": 'true'
  };
}
