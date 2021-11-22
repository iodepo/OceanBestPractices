const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const https = require('https');

const metadataBucket = process.env.DOCUMENT_METADATA_BUCKET || 'oop-doc-metadata';

const obp = {
  host: 'repository.oceanbestpractices.org',
  metadataPath: '/rest/items/{uuid}/metadata',
  findPath: '/rest/items/find-by-metadata-field?expand=metadata,bitstreams',
  accepts: 'application/json',
  userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5',
};

exports.handler = (event, context, callback) => {
  const docURI = event.Records[0].Sns.Message;

  getDocumentFromURI(docURI, (err, doc) => {
    if (doc !== null) {
      putDocument(doc, callback);
    } else if (err) {
      callback(err, {
        statusCode: 500,
        body: JSON.stringify({ err }),
      });
    } else {
      callback(null, { statusCode: 403 });
    }
  });
};

function getDocumentFromURI(uri, callback) {
  const opts = {
    hostname: obp.host,
    path: obp.findPath,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': obp.userAgent,
    },
  };

  const reqData = JSON.stringify({
    key: 'dc.identifier.uri',
    value: uri,
  });

  const req = https.request(opts, (res) => {
    let resData = '';

    res.on('data', (chunk) => {
      resData += chunk;
    });

    res.on('end', () => {
      const parsedResData = JSON.parse(resData);
      if (parsedResData.length > 0) {
        callback(null, parsedResData[0]);
      } else {
        callback(null, null);
      }
    });

    res.on('error', (err) => {
      callback(err, null);
    });
  });

  req.end(reqData);
}

function putDocument(doc, callback) {
  // FIXME: There's no reason we need to flatten
  // the metadata. Just push everything to S3.
  const { metadata } = doc;

  // We have to now include all bitstream data and
  // the lastModified field in order to support
  // diff-ing the index.
  metadata.push({
    key: 'handle',
    value: doc.handle,
  }, {
    key: 'lastModified',
    value: doc.lastModified,
  }, {
    key: 'bitstreams',
    value: doc.bitstreams,
  });

  // Get the thumbnail retrieveLink from the document.
  const thumbnailLink = findThumbnailLink(doc.bitstreams);
  if (thumbnailLink !== null) {
    metadata.push({
      key: 'thumbnail',
      value: thumbnailLink,
    });
  }

  const params = {
    Body: JSON.stringify(metadata),
    Bucket: metadataBucket,
    Key: `${doc.uuid}.json`,
  };

  s3.putObject(params, (err, data) => {
    if (err) {
      callback(err, {
        statusCode: 500,
        body: JSON.stringify({ err }),
      });
    } else {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(data),
      });
    }
  });
}

function findThumbnailLink(bitstreams) {
  const thumbnailBitstream = bitstreams.find((b) => b.bundleName === 'THUMBNAIL');

  return thumbnailBitstream !== undefined ? thumbnailBitstream.retrieveLink : null;
}
