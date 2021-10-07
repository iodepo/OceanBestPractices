'use strict'

const AWS = require('aws-sdk');

const lambda = new AWS.Lambda();

const textFunctionName = process.env.TEXT_EXTRACTOR_FUNCTION_NAME;
const textTempBucketName = process.env.TEXT_EXTRACTOR_TEMP_BUCKET;
const textBucketName = process.env.TEXT_EXTRACTOR_BUCKET;

exports.handler = (event, context, callback) => {

  const binaryBucket = event.Records[0].s3.bucket.name;
  const binaryKey = event.Records[0].s3.object.key;

  const textKey = binaryKey.split('.')[0] + '.txt';

  const payload = JSON.stringify({
    "document_uri": "s3://" + binaryBucket + "/" + binaryKey,
    "temp_uri_prefix": "s3://" + textTempBucketName + '/',
    "text_uri": "s3://" + textBucketName + '/' + textKey
  });

  lambda.invoke({
    FunctionName: textFunctionName,
    InvocationType: 'Event',
    Payload: payload
  }, function(err, data) {
    if (err) {
      callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
    } else {
      callback(null, {statusCode: 200, body: JSON.stringify({})});
    }
  });
}