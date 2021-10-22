'use strict';

const AWS = require('aws-sdk');

const http = require('http');

const ontology = {
  host: process.env.ONTOLOGY_STORE_HOST,
  port: process.env.ONTOLOGY_STORE_PORT, // 8890
  path: "/sparql",
};

exports.handler = (event, context, callback) => {
  const queryParams = event.queryStringParameters;

  if (queryParams === undefined || queryParams === null) {
    callback(null, { statusCode: 200, body: JSON.stringify([]), headers: responseHeaders() });
  } else if (queryParams.input === undefined || queryParams.input === null) {
    callback(null, { statusCode: 200, body: JSON.stringify([]), headers: responseHeaders() });
  } else {
    const opts = {
      input: queryParams.input,
      synonyms: queryParams.synonyms || false, 
    };

    getFuzzySemanticTerms(opts, function(err, results) {
      if (err !== null) {
        callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });  
      } else {
        callback(null, { statusCode: 200, body: JSON.stringify(results), headers: responseHeaders() });  
      }      
    });
  }
};

function buildFuzzySemanticTermsQuery(params) {
  var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
               PREFIX owl: <http://www.w3.org/2002/07/owl#> \
               PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
               PREFIX skos:<http://www.w3.org/2004/02/skos/core#> \
               SELECT DISTINCT ?label ?annotatedTarget ?annotatedProperty ?sameAsLabel \
               WHERE { \
                { \
                  SELECT DISTINCT ?label \
                  WHERE { \
                    ?s rdf:type owl:Class ; rdfs:label ?label . \
                    FILTER (STRSTARTS(lcase(str(?label)), '" + params.input.toLowerCase() + "')) \
                  } \
                } \
                UNION \
                { \
                  SELECT DISTINCT ?label \
                  WHERE { \
                    ?s rdf:type skos:Concept . \
                    ?s skos:prefLabel ?label . \
                    FILTER ( STRSTARTS(lcase(str(?label)), '" + params.input.toLowerCase() + "')) \
                  } \
                }";
  if (params.synonyms) {
    query += "\nUNION \
                { \
                  SELECT DISTINCT ?annotatedTarget ?annotatedPropertyLabel \
                  WHERE { \
                    ?nodeID owl:annotatedSource ?xs . \
                    ?nodeID owl:annotatedProperty ?annotatedProperty . \
                    ?nodeID owl:annotatedTarget ?annotatedTarget . \
                    ?annotatedProperty rdfs:label ?annotatedPropertyLabel . \
                    FILTER ( isLiteral( ?annotatedTarget ) ) . \
                    FILTER ( STR(?annotatedPropertyLabel) = 'has_exact_synonym' || STR(?annotatedPropertyLabel) = 'alternative_label') \
                    { \
                      SELECT DISTINCT ?xs \
                      WHERE { \
                        ?xs rdfs:label ?xl . \
                        FILTER (?xl = '" + params.input + "'^^xsd:string) \
                      } \
                    }\
                  } \
                } \
                UNION \
                { \
                  SELECT ?sameAsLabel \
                  WHERE { \
                    ?concept skos:prefLabel ?prefLabel . \
                    FILTER (str(?prefLabel) = '" + params.input + "') \
                    ?concept owl:sameAs ?sameAsConcept . \
                    ?sameAsConcept skos:prefLabel ?sameAsLabel . \
                  } \
                }";
  }

  query += "} LIMIT 50";
  
  console.log(JSON.stringify(query));
  
  return query;
}

function getFuzzySemanticTerms(params, callback) {

  const query = buildFuzzySemanticTermsQuery(params);

  const opts = {
    hostname: ontology.host,
    path: ontology.path + "?query=" + encodeURIComponent(query),
    port: ontology.port,
    headers: {
      'Accept': 'application/json'
    }
  };
  
  http.get(opts, function(res) {
    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('error', function(err) {
      callback(err, null);
    });

    res.on('end', function() {
      callback(null, parseOntologyResponseBody(body));
    });
  });
}

function parseOntologyResponseBody(body) {
  const parsedBody = JSON.parse(body);
  const matches = parsedBody.results.bindings;

  console.log(JSON.stringify(parsedBody));
  return matches.map(function(match) {
    if (match.label !== undefined) {
      return match.label.value;
    } else if (match.annotatedTarget !== undefined) {
      return match.annotatedTarget.value;  
    } else if (match.sameAsLabel !== undefined) {
      return match.sameAsLabel.value;
    } else {
      return undefined;
    }
  });
}

function responseHeaders() {
  return { 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Credentials": 'true' 
  };
}
