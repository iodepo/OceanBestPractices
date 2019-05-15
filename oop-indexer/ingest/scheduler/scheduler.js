'use strict';

const AWS = require('aws-sdk');

const sns = new AWS.SNS();

const https = require('https');

const xml2js = require('xml2js');

const topicArn = process.env.DOCUMENT_TOPIC_ARN;
const scheduleInterval = process.env.SCHEDULE_INTERVAL ? parseInt(process.env.SCHEDULE_INTERVAL) : 300;

const obp = {
  host: 'www.oceanbestpractices.net',
  path: '/feed/rss_2.0/site',
  accept: 'application/json',
  userAgent: "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5"
}

const xmlOpts = {
  explicitCharkey: false,
  trim: false,
  normalize: false,
  explicitRoot: false,
  emptyTag: null,
  explicitArray: true,
  ignoreAttrs: false,
  mergeAttrs: false,
  validator: null
};

exports.handler = (event, context, callback) => {
  const opts = {
    hostname: obp.host,
    path: obp.path,
    headers: {
      'Accept': obp.accept,
      'User-Agent': obp.userAgent
    }
  };

  https.get(opts, function(res) {
    var data = '';

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('error', function(err) {
      respondWithError(err, callback);
    });

    res.on('end', function() {
      var feed = parseXMLString(data, function(err, result) {
        if (err) {
          respondWithError(err, callback);
        } else {
          const pubDate = result['channel'][0]['pubDate'][0]["_"];
          const lastPublishedDate = Date.parse(pubDate);
          
          if (shouldPublishDocuments(lastPublishedDate)) {
            publishDocuments(result['channel'][0]['item'], callback);    
          } else {
            callback(null, {statusCode: 200, body: JSON.stringify({ documents: 0 })});
          }
        }
      });
    });
  });
}

function shouldPublishDocuments(publishedDate) {
  if (scheduleInterval === -1) {
    return true;
  }

  var scheduleIntervalDate = new Date();
  scheduleIntervalDate.setSeconds(scheduleInterval * -1)

  return publishedDate >= scheduleIntervalDate;
}

function publishDocuments(docs, callback) {
  var numPublished = 0;
  docs.forEach((doc) => {
    var params = {
      Message: doc['link'][0],
      TopicArn: topicArn,
    }

    sns.publish(params, function(err, data) {
      if (err) {
        console.log('Error publishing document:\n', JSON.stringify(err));
      } else {
        numPublished += 1;
      }
    });
  });

  callback(null, {statusCode: 200, body: JSON.stringify({ documents: numPublished })});
}

function respondWithError(err, callback) {
  console.log('Error:\n' + JSON.stringify(err));
  callback(err, {statusCode: 500, body: JSON.stringify({'err': err})});
} 

function parseXMLString(xmlString, callback) {
  const parser = new xml2js.Parser(xmlOpts);

  parser.parseString(xmlString, function(err, result) {
    if (err) {
      callback(err, null);
    } else {
      //console.log('Result\n', JSON.stringify(result['channel'][0]['item']));
      callback(err, result);
    }
  });
}