'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const region = process.env.REGION || 'us-east-1';

const metadataBucketName = process.env.DOCUMENT_METADATA_BUCKET;

const esHost = process.env.ELASTIC_SEARCH_HOST;
const esEndpoint = new AWS.Endpoint(esHost);

const creds = new AWS.EnvironmentCredentials('AWS');

const mapping = { 
                  "contents": "contents",
                  "sourceKey": "sourceKey",
                  "dc.date.issued": "issued_date",
                  "dc.title": "title",
                  "dc.description.abstract": "abstract",
                  "dc.publisher": "publisher",
                  "dc.contributor.author": "author",
                  "dc.language.iso": "language", 
                  "thumbnail": "thumbnail",
                  "uuid": "uuid",
                  "handle": "handle",
                  "terms": "terms",
                  "dc.title.alternative": "title_alt",
                  "dc.contributor.corpauthor": "corp_author",
                  "dc.contributor.editor": "editor",
                  "dc.bibliographicCitation.title": "journal_title",
                  "dc.description.eov": "essential_ocean_variables",
                  "dc.description.sdg": "sustainable_development_goals",
                  "dc.identifier.doi": "identifier_doi",
                  "dc.resource.uri": "resource_uri",
                  "dc.description.refereed": "refereed",
                  "dc.identifier.citation": "citation"
                };

exports.handler = (event, context, callback) => {
  var uuid, contentBucketName, contentKey, sourceKey, metadataKey = undefined;
  
  if (event.Records !== undefined && event.Records.length > 0) {
    const message = JSON.parse(event.Records[0].Sns.Message);  
    contentBucketName = message.Records[0].s3.bucket.name;
    contentKey = message.Records[0].s3.object.key;
    uuid = contentKey.split('.')[0];
    sourceKey = uuid + '.pdf';
    metadataKey = uuid + '.json';
  } else {
    uuid = event["uuid"];
    metadataKey = uuid + '.json';
  }
  
  getContent(contentBucketName, contentKey, function(err, content) {
    if (err) {
      callback(err, null);
    } else {
      
      getMetadata(metadataBucketName, metadataKey, function(err, metadata) {
        if (err) {
          callback(err, null);
        } else {
          metadata.push({ key: "contents", value: content });
          metadata.push({ key: "uuid", value: uuid });
          metadata.push({ key: "sourceKey", value: sourceKey || '' });
          
          const titleObject = metadata.find(function(m) { return m.key === "dc.title"});
          const title = titleObject !== undefined ? titleObject.value : '';
          
          percolateTerms(title, content, function(err, terms) {
            if (err === null) {
              metadata.push({ key: "terms", value: terms });
              
              indexDocument(mapMetadata(metadata), function(err, resp) {
                if (err) {
                  callback(err, null);
                } else {
                  callback(null, resp);
                }
              });
            } else {
              callback(err, null);
            }
          });
        }
      });
    }
  });
};

function getContent(bucket, key, callback) {
  var docContent = '';
  
  if (bucket === undefined || key === undefined) {
    callback(null, docContent);
    return;
  }
  
  s3.getObject({
    Bucket: bucket,
    Key: key,
  })
  .on('error', function(err) {
    callback(err, null);
  })
  .on('httpData', function(chunk) {
    docContent += chunk;
  })
  .on('httpDone', function() {
    callback(null, docContent);
  })
  .send();
}

function getMetadata(bucket, key, callback) {
  s3.getObject({
    Bucket: bucket,
    Key: key,
  }, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, JSON.parse(data.Body));  
    }
  });
}

function mapMetadata(metadata) {
  var indexDoc = {};

  metadata.forEach((data) => {
    var indexKey = mapping[data["key"]];
    if (indexKey !== undefined && indexKey !== null) {
      var indexValue = indexDoc[indexKey];

      // Check if we have a value for this index key. This can happen e.g. authors
      // where the metadata has multiple entries for the same metadata key.
      // If we multiple entries for the same key, index them as an array.
      if (indexValue !== undefined) {
        // We already have a value for this metadata key. Either add it to an existing
        // array of values or convert this index value into an array of metadata values.
        if (Array.isArray(indexValue)) {
          indexValue.push(data.value);
        } else {
          indexValue = [indexValue, data.value];
        }        
      } else {
        indexValue = data.value;  
      }

      indexDoc[indexKey] = indexValue;
    }
  });
  
  return indexDoc;
}

function indexDocument(doc, callback) {
  var indexBody = JSON.stringify(doc);

  const req = getIndexRequest(doc.uuid, indexBody);

  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, function(httpResp) {
    var body = '';
    httpResp.on('data', function(chunk) {
      body += chunk;
    });
    
    httpResp.on('error', function(err) {
      console.log("Index error:\n" + JSON.stringify(err));
      callback(null, "Index error:\n" + JSON.stringify(err));
    });

    httpResp.on('end', function(chunk) {
      console.log("Index response: " + httpResp.statusCode + ': ' + httpResp.body + "\nBody:\n"  + body);
      callback(null, "Index response: " + httpResp.statusCode + ': ' + httpResp.body + '\nBody:\n' + body);
    });
  }, function(err) {
    callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
  });
}

function getIndexRequest(id, body) {
  const req = new AWS.HttpRequest(esEndpoint);
  req.method = 'POST';
  req.path = '/documents/doc/' + id;
  req.body = body;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers['Host'] = esEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

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
  var percolatorQuery = { query: { percolate: { field: "query", document: { contents: contents, title: title } } }, size: size, from: from };

  const req = buildPercolatorRequest(JSON.stringify(percolatorQuery));
  makePercolatorRequest(req, function(err, hits) {
    if (err === null) {
      var hitsData = hits.hits;
      var terms = hitsData.map(function(h) {
        return { label: h["_source"]["query"]["multi_match"]["query"], uri: h["_id"], source_terminology: h["_source"]["source_terminology"] };
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
      console.log("Percolator request:\n" + JSON.stringify(body));
      var hits = JSON.parse(body).hits;
      callback(null, hits); 
    });
  });
}
