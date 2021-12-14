'use-strict';

/**
 * This function queries the triple store for the semantic neighborhood of the given
 * term or term URI. It supports both OWL and SKOS queries.
 */

const AWS = require('aws-sdk');

const https = require('https');

const ontology = {
  host: process.env.ONTOLOGY_STORE_HOST,
  port: process.env.ONTOLOGY_STORE_PORT,
  path: '/sparql',
};

/**
 * Default handler. Expects query string parameters of `termURI` or `term`
 * and if not present returns an empty result set.
 */
exports.handler = (event, context, callback) => {
  const queryParams = event.queryStringParameters;

  if (queryParams.termURI !== undefined) {
    graphTermURI(queryParams.termURI, callback);
  } else if (queryParams.term !== undefined) {
    graphTerm(queryParams.term, callback);
  } else {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({}),
      headers: responseHeaders(),
    });
  }
};

/**
 * Executes a semantic neighborhood query for a given term. This function first
 * exectures a search to get the term URI in order to execute the graph query.
 */
function graphTerm(term, callback) {
  // Query the triple store to get the URI of the given term. That'll be used in
  // the actual graph query.
  executeQuery(buildTermIRIQuery(term), (err, results) => {
    if (err === null) {
      if (results.length === 0 || results[0].s.value === undefined) {
        callback(null, {
          statusCode: 200,
          body: JSON.stringify({}),
          headers: responseHeaders(),
        });
      } else {
        const termIRI = results[0].s.value;
        graphTermURI(termIRI, callback);
      }
    } else {
      respondWithError(err, callback);
    }
  });
}

/**
 * Executes a semantic neighborhood query for a given term URI. It determines which
 * query to use based on the origin of the given URI.
 */
function graphTermURI(termURI, callback) {
  // This is a hacky way to determine which query to use.
  // FIXME: This method should use metadata about the ontology (term URI) to determine
  // the ontology type and therefore which queries to use.
  if (termURI.includes('purl.obolibrary.org') || termURI.includes('purl.unep.org')) {
    executeQuery(buildSuperTermQuery(termURI), (err, supers) => {
      if (err === null) {
        executeQuery(buildUsesInOntologyQuery(termURI), (err, uses) => {
          if (err === null) {
            const graph = {
              parents: parseSuperTermResponse(supers),
              children: parseUsesInOntologyResponse(uses),
            };
            callback(null, {
              statusCode: 200,
              body: JSON.stringify(graph),
              headers: responseHeaders(),
            });
          } else {
            respondWithError(err, callback);
          }
        });
      } else {
        respondWithError(err, callback);
      }
    });
  } else {
    executeQuery(buildSKOSGraphQuery(termURI), (err, relations) => {
      if (err === null) {
        const graph = parseSKOSGraphResponse(relations);
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(graph),
          headers: responseHeaders(),
        });
      } else {
        respondWithError(err, callback);
      }
    });
  }
}

/**
 * Helper function that builds some shared options used in a triple store request.
 */
function queryOpts(query) {
  return {
    hostname: ontology.host,
    path: `${ontology.path}?query=${encodeURIComponent(query)}`,
    port: ontology.port,
    headers: {
      Accept: 'application/json',
    },
  };
}

/**
 * Executes an HTTP request against the triple store with a given semantic
 * neighborhood query.
 */
function executeQuery(query, callback) {
  https.get(queryOpts(query), (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('error', (err) => {
      callback(err, null);
    });

    res.on('end', () => {
      callback(null, JSON.parse(body).results.bindings);
    });
  });
}

/**
 * Helper function that builds the SPARQL query for a SKOS vocabulary.
 */
function buildSKOSGraphQuery(termURI, callback) {
  const ontGraph = sourceGraphFor(termURI);

  const query = `PREFIX dc:<http://purl.org/dc/elements/1.1/> \
         PREFIX skos:<http://www.w3.org/2004/02/skos/core#> \
         PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
         SELECT ?narrower ?narrowerLabel ?broader ?broaderLabel ?related ?relatedLabel \
         WHERE {  \
           OPTIONAL {  \
             <${termURI}> skos:broader ?broader .  \
             ?broader skos:prefLabel ?broaderLabel . \
           } \
           OPTIONAL {  \
             <${termURI}> skos:narrower ?narrower .  \
             ?narrower skos:prefLabel ?narrowerLabel . \
           } \
           OPTIONAL {  \
             <${termURI}> skos:related ?related .  \
             ?related skos:prefLabel ?relatedLabel . \
           } \
         }`;

  return query;
}

/**
 * Helper function that builds the SPARQL query that searches for a term URI
 * from a given term.
 */
function buildTermIRIQuery(term) {
  return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
          PREFIX owl: <http://www.w3.org/2002/07/owl#> \
          SELECT DISTINCT ?s \
          WHERE { \
            ?s rdf:type owl:Class . \
            ?s rdfs:label ?label . \
            FILTER ( str(?label) = '${term}' ) . \
          }`;
}

/**
 * Helper function that builds the SPARQL query that searches for related (e.g. superClass)
 * of a given term URI. This query supports OWL formats.
 */
function buildSuperTermQuery(termIRI) {
  const ontGraph = sourceGraphFor(termIRI);
  return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
          PREFIX owl: <http://www.w3.org/2002/07/owl#> \
          SELECT ?term ?superTerm ?superLabel ?relLabel ?ref ?refLabel \
          FROM ${ontGraph} \
          WHERE { \
            ?term rdfs:subClassOf ?superTerm . \
            OPTIONAL { ?superTerm rdfs:label ?superLabel } \
            OPTIONAL { ?superTerm owl:onProperty ?rel . ?rel rdfs:label ?relLabel . } \
            OPTIONAL { ?superTerm owl:someValuesFrom ?ref . ?ref rdfs:label ?refLabel . } \
            FILTER (?term = <${termIRI}>) \
          }`;
}

/**
 * Helper function that builds the SPARQL query that searches an OWL ontology for other uses
 * of the given term URI.
 */
function buildUsesInOntologyQuery(termIRI) {
  const ontGraph = sourceGraphFor(termIRI);

  let query = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX owl: <http://www.w3.org/2002/07/owl#>';
  query += ' SELECT DISTINCT ?ref ?label ?rell';
  query = `${query} FROM ${ontGraph}`;
  query += ' WHERE { ?ref ?refp ?o . FILTER ( ?refp IN ( owl:equivalentClass, rdfs:subClassOf ) ) . OPTIONAL { ?ref rdfs:label ?label } . OPTIONAL { ?o owl:onProperty ?rel . ?rel rdfs:label ?rell } .';
  query += ' {';
  query += ' {';
  query = `${query} SELECT ?s ?p ?o FROM ${ontGraph}`;
  query += ' WHERE { ?o ?p ?s . FILTER ( ?p IN ( rdf:first, rdf:rest, owl:intersectionOf, owl:unionOf, owl:someValuesFrom, owl:hasValue, owl:allValuesFrom, owl:complementOf, owl:inverseOf, owl:onClass, owl:onProperty ) ) } }';
  query = `${query} FILTER ( ?s = <${termIRI}> ) } } ORDER BY ?label`;

  return query;
}

/**
 * Parses the response of a semantic neighborhood query against a SKOS vocabulary. This function parses
 * the raw JSON response and organizes the result in a tree-like object which the client should understand.
 * Terms are put into related buckets such as "parents", "children", and "siblings", which for a SKOS
 * vocabulary map to narrow, broader, and related annotated properties respectively.
 */
function parseSKOSGraphResponse(results) {
  const graph = {};

  for (const r of results) {
    if (r.narrower !== undefined) {
      if (graph['parents'] === undefined) {
        graph['parents'] = {};
      }

      if (graph['parents']['narrower'] === undefined) {
        graph['parents']['narrower'] = [];
      }

      graph['parents']['narrower'].push({
        uri: r.narrower.value,
        label: r.narrowerLabel.value,
      });
    } else if (r.broader !== undefined) {
      if (graph['children'] === undefined) {
        graph['children'] = {};
      }

      if (graph['children']['broader'] === undefined) {
        graph['children']['broader'] = [];
      }

      graph['children']['broader'].push({
        uri: r.broader.value,
        label: r.broaderLabel.value,
      });
    } else if (r.related !== undefined) {
      if (graph['siblings'] === undefined) {
        graph['siblings'] = {};
      }

      if (graph['siblings']['related'] === undefined) {
        graph['siblings']['related'] = [];
      }

      graph['siblings']['related'].push({
        uri: r.related.value,
        label: r.relatedLabel.value,
      });
    }
  }

  return graph;
}

/**
 * Parses the result of the OWL "uses in ontology" query.
 */
function parseUsesInOntologyResponse(results) {
  const graph = {};
  for (const r of results) {
    if (graph[r.rell.value] === undefined) {
      graph[r.rell.value] = [];
    }

    graph[r.rell.value].push({
      uri: r.ref.value,
      label: r.label.value,
    });
  }

  return graph;
}

/**
 * Parses the result of the OWL super class query.
 */
function parseSuperTermResponse(results) {
  const graph = {};
  for (const r of results) {
    // We can only return results that have a label in the searched ontology.
    // For those that have a node reference, check to make sure we have a label
    // for that node before trying to include it in the result set.
    if (r.superTerm.value.startsWith('nodeID') && r.relLabel !== undefined) {
      if (graph[r.relLabel.value] === undefined) {
        graph[r.relLabel.value] = [];
      }

      graph[r.relLabel.value].push({
        label: r.refLabel.value,
        uri: r.ref.value,
      });
    } else if (r.superLabel !== undefined && r.superTerm !== undefined) {
      // If there is no node reference, just assume the result is related as
      // an "is a" relationship
      if (graph['is a'] === undefined) {
        graph['is a'] = [];
      }

      graph['is a'].push({
        label: r.superLabel.value,
        uri: r.superTerm.value,
      });
    }
  }

  return graph;
}

/**
 * FIXME: This method should instead be a lookup table in DynamoDB.
 * Helper function that maps a termURI to a source triple store graph.
 */
function sourceGraphFor(termURI) {
  const termID = termURI.slice(termURI.lastIndexOf('/') + 1);
  if (termID.startsWith('CHEBI')) {
    return '<http://purl.obolibrary.org/obo/chebi.owl>';
  } if (termID.startsWith('SDGIO')) {
    return '<http://purl.unep.org/sdg/sdgio.owl>';
  } if (termID.startsWith('ENVO')) {
    return '<http://purl.obolibrary.org/obo/envo.owl>';
  } if (termURI.includes('L05')) {
    return '<http://vocab.nerc.ac.uk/collection/L05/current/>';
  } if (termURI.includes('L22')) {
    return '<http://vocab.nerc.ac.uk/collection/L22/current/>';
  } if (termURI.includes('L06')) {
    return '<http://vocab.nerc.ac.uk/collection/L06/current/>';
  }
  return null;
}

/**
 * Helper function that sets a default error response.
 */
function respondWithError(err, callback) {
  callback(err, {
    statusCode: 500,
    body: JSON.stringify({ err }),
    headers: responseHeaders(),
  });
}

/**
 * Helper function that provides the default response headers.
 */
function responseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
}
