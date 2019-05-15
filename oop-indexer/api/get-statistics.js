'use strict';

const AWS = require('aws-sdk');
const http = require('http');

const region = process.env.REGION || 'us-east-1';

const elasticSearch = {
  host: process.env.ELASTIC_SEARCH_HOST,
  path: '/documents/_count',
};
const elasticEndpoint = new AWS.Endpoint(elasticSearch.host);
const creds = new AWS.EnvironmentCredentials('AWS');

const ontology = {
  host: process.env.ONTOLOGY_STORE_HOST,
  port: process.env.ONTOLOGY_STORE_PORT, // 8890
  path: "/sparql",
};

exports.handler = (event, context, callback) => {
  getDocumentCount(function(err, documentCount) {
    if (err !== null) {
      callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });
    } else {
      getTermCount(function(err, termCount) {
        if (err !== null) {
          callback(err, { statusCode: 500, body: JSON.stringify({'err': err}), headers: responseHeaders() });
        } else {
          callback(null, { statusCode: 200, body: JSON.stringify(responseBody(documentCount, termCount)), headers: responseHeaders() });
        }
      });
    }
  });
}

function getTermCount(callback) {
  const sparqlQuery = "SELECT DISTINCT count(?label) WHERE { ?s a owl:Class . ?s rdfs:label ?label . }";

  const opts = {
    hostname: ontology.host,
    path: ontology.path + "?query=" + encodeURIComponent(sparqlQuery),
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

function getDocumentCount(callback) {
  const req = buildElasticSearchRequest();

  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, function(httpResp) {
    var body = '';
    httpResp.on('data', function(chunk) {
      body += chunk;
    });

    httpResp.on('end', function() {
      var count = JSON.parse(body).count;
      callback(null, count);
    });
  }, function(err) {
    callback(err, 0);
  });
}

function buildElasticSearchRequest() {
  const req = new AWS.HttpRequest(elasticEndpoint);
  req.method = 'GET';
  req.path = elasticSearch.path;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers['Host'] = elasticEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

function parseOntologyResponseBody(body) {
  const parsedBody = JSON.parse(body);
  return parseInt(parsedBody.results.bindings[0]['callret-0'].value);
}

function responseBody(documentCount, termCount) {
  return {
    documents: {
      count: documentCount
    },
    ontologies: {
      // TODO: Get the count of ontologies by querying for ontology metadata.
      count: 6,
      terms: {
        count: termCount        
      }
    }
  };
}

function responseHeaders() {
  return { 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Credentials": true 
  };
}