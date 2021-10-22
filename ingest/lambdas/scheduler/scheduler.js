'use strict';

const AWS = require('aws-sdk');

const sns = new AWS.SNS();

const https = require('https');

const xml2js = require('xml2js');

const topicArn = process.env.DOCUMENT_TOPIC_ARN;

const scheduleInterval = process.env.SCHEDULE_INTERVAL ? parseInt(process.env.SCHEDULE_INTERVAL) : 300;

const dspace = {
  host: 'repository.oceanbestpractices.org',
  path: '/feed/rss_2.0/site',
  accept: 'application/json',
  userAgent: "Mozill;a/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5"
};

exports.handler = async (event) => {
  
  try {
    // Fetch the raw RSS feed.
    const rawFeed = await getFeedContent();
    
    // Parse the RSS feed since we received XML.
    const parsedFeed = await parseXMLString(rawFeed);
      
    // Parse out the last published date and use it to determine whether or
    // not we should index new documents.
    const pubDate = parsedFeed['channel'][0]['pubDate'][0]["_"];
    const lastPublishedDate = Date.parse(pubDate);
    
    let numDocumentsPublished = 0;
    if (shouldPublishDocuments(lastPublishedDate)) {
      // If we have new or updated documents we should publish them to our SNS topic.
      numDocumentsPublished = await publishDocuments(parsedFeed['channel'][0]['item']); 
    } 

    // Return num documents published response.
    return { statusCode: 200, body: JSON.stringify({ documents: numDocumentsPublished }) };
  } catch (err) {
    console.log('Error:\n' + JSON.stringify(err));
    return { statusCode: 500, body: JSON.stringify({ err: err }) };
  }

};

/**
 * Fetches the RSS feed from the configured DSpace host.
 * 
 * @returns The raw (XML) RSS feed from DSpace.
 */
async function getFeedContent() {
  const opts = {
    hostname: dspace.host,
    path: dspace.path,
    headers: {
      'Accept': dspace.accept,
      'User-Agent': dspace.userAgent
    }
  };

  return new Promise((resolve, reject) => {
    https.get(opts, function(res) {
      var data = '';
  
      res.on('data', function(chunk) {
        data += chunk;
      });
  
      res.on('error', function(err) {
        reject(err);
      });
  
      res.on('end', function() {
        resolve(data);
      });
    });
  });
}

/**
 * Returns a boolean indiciting whether or not we shoudl publish documents from the RSS feed based
 * on when the RSS feed was published and the last time we checked it. Set the `scheduleInterval` to
 * -1 to always pass this test.
 * 
 * @param {Date} publishedDate The published date of the RSS feed.
 * 
 * @returns Whether or not we should publish new documents based 
 *          on the last time we checked the RSS feed
 */
function shouldPublishDocuments(publishedDate) {
  if (scheduleInterval === -1) {
    return true;
  }

  var scheduleIntervalDate = new Date();
  scheduleIntervalDate.setSeconds(scheduleInterval * -1);

  return publishedDate >= scheduleIntervalDate;
}

/**
 * Publishes a list of documents to the configured SNS topic. This function parses out the 'link' value
 * of a document and uses that as the message content for the SNS message.
 * 
 * @param {*} docs List of documents that should be published to the configured SNS topic.
 * 
 * @returns The number of documents successfully published.
 */
async function publishDocuments(docs) {
  var numPublished = 0;
  
  for (const doc of docs) {
    try {
      const params = {
        Message: doc['link'][0],
        TopicArn: topicArn,
      };
      
      await sns.publish(params).promise();
      
      numPublished += 1;
    } catch (err) {
      console.log('Error publishing document:\n', JSON.stringify(err));
    }
  }
  
  return numPublished;
}

/**
 * Parses a given raw XML RSS feed and returns it as an object.
 * 
 * @param {String} xmlString The raw XML to parse.
 * 
 * @returns The given XML as an object.
 */
async function parseXMLString(xmlString) {
  return new Promise((resolve, reject) => {
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

    const parser = new xml2js.Parser(xmlOpts);

    parser.parseString(xmlString, function(err, result) {
      if (err) {
        reject(err);
      } else {
        //console.log('Result\n', JSON.stringify(result['channel'][0]['item']));
        resolve(result);
      }
    });
  });
}