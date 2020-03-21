'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const https = require('https');

const binaryBucket = process.env.DOCUMENT_BINARY_BUCKET;
const indexerFunctionName = process.env.INDEXER_FUNCTION_NAME;

const obp = {
  host: "repository.oceanbestpractices.org",
  path: "/rest/items/{uuid}/bitstreams",
  accepts: 'application/json',
  userAgent: "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
};

exports.handler = (event, context, callback) => {

  var contentBucketName = event.Records[0].s3.bucket.name;
  var contentKey = event.Records[0].s3.object.key;

  const docUUID = contentKey.split('.')[0];  
  const bitstreamsPath = obp.path.replace('{uuid}', docUUID);

  const opts = {
    hostname: obp.host,
    path: bitstreamsPath,
    headers: {
      'Accepts': obp.accepts,
      'User-Agent': obp.userAgent,
    }
  };

  https.get(opts, function(res) {
    var bitstreamsBody = '';

    res.on('data', function(chunk) {
      bitstreamsBody += chunk;
    });

    res.on('end', function() {
      var bitstreams = JSON.parse(bitstreamsBody);
      var pdfBitstream = bitstreams.find(function(b) {
        return (b.bundleName === "ORIGINAL" && b.mimeType === "application/pdf");
      });

      if (pdfBitstream !== undefined) {
        downloadBitstream(docUUID, pdfBitstream, callback);
      } else {
        invokeIndexer(docUUID, callback);
      }
    });
  });
};

function invokeIndexer(uuid, callback) {
  const lambda = new AWS.Lambda();
  const payload = JSON.stringify({
    "uuid": uuid
  });
  
  lambda.invoke({
    FunctionName: indexerFunctionName,
    InvocationType: 'Event',
    Payload: payload
  }, function(err, data) {
    if (err) {
      console.log("Error invoking indexer:\n" + JSON.stringify(err));
      callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});      
    } else {
      callback(null, {statusCode: 200, body: JSON.stringify({})});      
    }
  });

}

function downloadBitstream(uuid, bitstream, callback) {
  const opts = {
    hostname: obp.host,
    path: bitstream.retrieveLink,
    headers: {
      'User-Agent': obp.userAgent,
    }
  };

  https.get(opts, function(res) {
    var bitstreamData = [];

    res.on('data', function(chunk) {
      bitstreamData.push(chunk);
    });

    res.on('end', function() {
      uploadBinary(uuid, Buffer.concat(bitstreamData), callback);
    });

    res.on('error', function(err) {
      callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
    });
  }).on('error', function(err) {
    callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
  });
}

function uploadBinary(uuid, data, callback) {
  var s3Opts = {
    Bucket: binaryBucket,
    Key: uuid + '.pdf',
    Body: data
  };

  s3.putObject(s3Opts, function(err, data) {
    if (err) {
      callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
    } else {
      callback(null, {statusCode: 200, body: JSON.stringify({})});
    }
  });
}