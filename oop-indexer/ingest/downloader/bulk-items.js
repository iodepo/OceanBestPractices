'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const https = require('https');

const metadataBucket = process.env.DOCUMENT_METADATA_BUCKET || 'oop-doc-metadata';

const obp = {
  host: "www.oceanbestpractices.net",
  itemsPath: "/rest/items",
  metadataPath: "/rest/items/{uuid}/metadata",
  findPath: '/rest/items/find-by-metadata-field',
  accepts: 'application/json',
  userAgent: "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
};

exports.handler = (event, context, callback) => {
  const queryParams = event.queryStringParameters;
  const offset = queryParams.offset !== undefined ? queryParams.offset : 0;
  const limit = queryParams.limit !== undefined ? queryParams.limit : 100;

  const opts = {
    hostname: obp.host,
    path: obp.itemsPath + '?offset=' + offset + '&limit=' + limit + '&expand=metadata,bitstreams',
    headers: {
      'Accept': obp.accepts,
      'User-Agent': obp.userAgent
    }    
  };

  https.get(opts, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      var items = JSON.parse(body);
      if (items.length > 0) {
        Promise.all(items.map((i) => {
          var metadata = i.metadata;
          metadata.push({'key': 'handle', 'value': i.handle});
          
          // Get the thumbnail retrieveLink from the document.
          const thumbnailLink = findThumbnailLink(i.bitstreams);
          if (thumbnailLink !== null) {
            metadata.push({"key": "thumbnail", "value": thumbnailLink});  
          }
          
          return putMetadata(i.uuid, JSON.stringify(metadata));
        })).then((values) => {
          callback(null, {statusCode: 200, body: JSON.stringify(values)});
        });
      } else {
        callback(null, { statusCode: 200, body: JSON.stringify([])});
      }
    });
  }).on('error', function(err) {
    callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
  });
}

function putMetadata(docUUID, metadata, callback) {
  const params = {
    Body: metadata,
    Bucket: metadataBucket,
    Key: docUUID + '.json',
  };

  return s3.putObject(params).promise();
}

function findThumbnailLink(bitstreams) {
  var thumbnailBitstream = bitstreams.find(function(b) {
    return b.bundleName === "THUMBNAIL";
  });

  return thumbnailBitstream !== undefined ? thumbnailBitstream.retrieveLink : null;
}