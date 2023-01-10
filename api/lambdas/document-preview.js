const AWS = require('aws-sdk');
const region = process.env.REGION || 'us-east-1';
const esHost = process.env.ELASTIC_SEARCH_HOST;
const esEndpoint = new AWS.Endpoint(esHost);
const creds = new AWS.EnvironmentCredentials('AWS');

exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const title = body.title;
    const contents = body.contents;
    
    var form = 'json';
    if (event.queryStringParameters !== null && event.queryStringParameters.form !== null) {
      form = event.queryStringParameters.form;
    }
    
    try {
      
      const terms = await new Promise((resolve, reject) => {
        percolateTerms(title, contents, (err, terms) => {
            if (err == null) {
                resolve(terms);   
            } else {
                reject(err);           
            }       
        });
      });

      var contentType = '';
      var termsInFormat = '';
      
      if (form === 'csv') {
        contentType = 'application/text';
        termsInFormat = convertTermsToCSV(terms);
      } else {
        contentType = 'application/json';
        termsInFormat = JSON.stringify(terms);
      }

      return {
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': contentType },
        statusCode: 200,
        body: termsInFormat
      };
    }
    catch (err) {
      console.log(err);
      return {
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        statusCode: 500,
        body: { "err": err }
      };
    }
        
};

function buildPercolatorRequest(body) {
  const req = new AWS.HttpRequest(esEndpoint);
  req.method = 'POST';
  req.path = '/terms/_search';
  req.body = body;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers['Host'] = esEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

function percolateTerms(title, contents, callback) {
  var from = 0, size = 300;
  var percolatorQuery = { 
    query: { 
      percolate: { 
        field: "query", 
        document: { 
          contents: contents, 
          title: title 
        } 
      } 
      }, 
    size: size, 
    from: from 
  };

  const req = buildPercolatorRequest(JSON.stringify(percolatorQuery));
  makePercolatorRequest(req, function(err, hits) {
    if (err === null) {
      var hitsData = hits.hits;
      var terms = hitsData.map(function(h) {
        return { 
          label: h["_source"]["query"]["multi_match"]["query"], 
          uri: h["_id"], 
          source_terminology: h["_source"]["source_terminology"] 
        };
      });

      callback(null, terms);
    } else {
      callback(err, []);
    }
  }); 
}

function makePercolatorRequest(req, callback) {
  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, function(httpResp) {
    var body = '';
    httpResp.on('data', function(chunk) {
      body += chunk;
    });
    
    httpResp.on('error', function(err) {
      callback(err, null);
    });

    httpResp.on('end', function(chunk) {
      //console.log("Percolator request:\n" + JSON.stringify(body));
      var hits = JSON.parse(body).hits;
      callback(null, hits); 
    });
  });
}

function convertTermsToCSV(terms) {
  var str = 'Label,URI,Source Terminology\n';

  terms.forEach((t) => {
    str += [t.label, t.uri, t.source_terminology].join(',');
    str += "\n";
  });

  return str;
}
