const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const metadataBucketName = process.env.DOCUMENT_METADATA_BUCKET;

const esHost = process.env.ELASTIC_SEARCH_HOST;
const esEndpoint = new AWS.Endpoint(esHost);

const creds = new AWS.EnvironmentCredentials('AWS');

/**
 * The mapping defines the translations between the DSpace repository field names
 * and our internal Elasticsearch index.
 */
const mapping = {
  contents: 'contents',
  'dc.bibliographicCitation.title': 'journal_title',
  'dc.contributor.author': 'author',
  'dc.contributor.corpauthor': 'corp_author',
  'dc.contributor.editor': 'editor',
  'dc.coverage.spatial': 'coverage_spatial',
  'dc.date.issued': 'issued_date',
  'dc.description.abstract': 'abstract',
  'dc.description.bptype': 'bptype',
  'dc.description.currentstatus': 'current_status',
  'dc.description.eov': 'essential_ocean_variables',
  'dc.description.maturitylevel': 'maturity_level',
  'dc.description.notes': 'notes',
  'dc.description.refereed': 'refereed',
  'dc.description.sdg': 'sustainable_development_goals',
  'dc.description.status': 'publication_status',
  'dc.identifier.citation': 'citation',
  'dc.identifier.doi': 'identifier_doi',
  'dc.identifier.orcid': 'identifier_orcid',
  'dc.language.iso': 'language',
  'dc.publisher': 'publisher',
  'dc.relation.ispartofseries': 'relation_is_part_of_series',
  'dc.relation.uri': 'relation_uri',
  'dc.resource.uri': 'resource_uri',
  'dc.subject.dmProcesses': 'subjects_dm_processes',
  'dc.subject.instrumentType': 'subjects_instrument_type',
  'dc.subject.other': 'subjects_other',
  'dc.subject.parameterDiscipline': 'subjects_parameter_discipline',
  'dc.title': 'title',
  'dc.title.alternative': 'title_alt',
  'dc.type': 'type',
  handle: 'handle',
  sourceKey: 'sourceKey',
  terms: 'terms',
  thumbnail: 'thumbnail',
  uuid: 'uuid',
  lastModified: 'lastModified',
  bitstreams: 'bitstreams',
};

exports.handler = (event, context, callback) => {
  const region = context.invokedFunctionArn.split(':')[3];

  let uuid; let contentBucketName; let contentKey; let sourceKey; let
    metadataKey;

  if (event.Records !== undefined && event.Records.length > 0) {
    const message = JSON.parse(event.Records[0].Sns.Message);
    contentBucketName = message.Records[0].s3.bucket.name;
    contentKey = message.Records[0].s3.object.key;
    uuid = contentKey.split('.')[0];
    sourceKey = `${uuid}.pdf`;
    metadataKey = `${uuid}.json`;
  } else {
    uuid = event.uuid;
    metadataKey = `${uuid}.json`;
  }

  getContent(contentBucketName, contentKey, (err, content) => {
    if (err) {
      callback(err, null);
    } else {
      getMetadata(metadataBucketName, metadataKey, (err, metadata) => {
        if (err) {
          callback(err, null);
        } else {
          metadata.push({
            key: 'contents',
            value: content,
          }, {
            key: 'uuid',
            value: uuid,
          }, {
            key: 'sourceKey',
            value: sourceKey || '',
          });

          const titleObject = metadata.find((m) => m.key === 'dc.title');
          const title = titleObject !== undefined ? titleObject.value : '';

          percolateTerms(title, content, (err, terms) => {
            if (err === null) {
              metadata.push({
                key: 'terms',
                value: terms,
              });

              indexDocument(mapMetadata(metadata), (err, resp) => {
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

/**
 * Fetches the document content (the extracted document text) from S3.
 * @param {string} bucket The content bucket
 * @param {string} key The object key (typically the document UUID) within the content bucket
 * @param {function} callback Callback function to process the S3 response
 */
function getContent(bucket, key, callback) {
  let docContent = '';

  if (bucket === undefined || key === undefined) {
    callback(null, docContent);
    return;
  }

  s3.getObject({
    Bucket: bucket,
    Key: key,
  })
    .on('error', (err) => {
      callback(err, null);
    })
    .on('httpData', (chunk) => {
      docContent += chunk;
    })
    .on('httpDone', () => {
      callback(null, docContent);
    })
    .send();
}

/**
 * Fetches the document metadata from S3.
 * @param {string} bucket The metadata bucket
 * @param {string} key The object key (typicallyt he document UUID) within the metadata bucket
 * @param {function} callback Callback function to process the S3 response
 */
function getMetadata(bucket, key, callback) {
  s3.getObject({
    Bucket: bucket,
    Key: key,
  }, (err, data) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, JSON.parse(data.Body));
    }
  });
}

/**
 * Iterates through our target fields and extracts the values from the original
 * document matadata copying them to a map that matches our internal Elasticsearch
 * index. Processes fields individually to handle special cases like arrays.
 * @param {object} metadata The original document metadata
 * @returns Object with keys/values ready for indexing in our Elasticsearch index
 */
function mapMetadata(metadata) {
  const indexDoc = {};

  for (const data of metadata) {
    const indexKey = mapping[data.key];
    if (indexKey !== undefined && indexKey !== null) {
      let indexValue = indexDoc[indexKey];

      // Check if we have a value for this index key. This can happen e.g. authors
      // where the metadata has multiple entries for the same metadata key.
      // If we have multiple entries for the same key, index them as an array.
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
  }

  return indexDoc;
}

function indexDocument(doc, region, callback) {
  const indexBody = JSON.stringify(doc);

  const req = getIndexRequest(doc.uuid, indexBody, region);

  const signer = new AWS.Signers.V4(req, 'es');
  signer.addAuthorization(creds, new Date());

  const client = new AWS.NodeHttpClient();
  client.handleRequest(req, null, (httpResp) => {
    let body = '';
    httpResp.on('data', (chunk) => {
      body += chunk;
    });

    httpResp.on('error', (err) => {
      console.log(`Index error:\n${JSON.stringify(err)}`);
      callback(null, `Index error:\n${JSON.stringify(err)}`);
    });

    httpResp.on('end', (chunk) => {
      console.log(`Index response: ${httpResp.statusCode}: ${httpResp.body}\nBody:\n${body}`);
      callback(null, `Index response: ${httpResp.statusCode}: ${httpResp.body}\nBody:\n${body}`);
    });
  }, (err) => {
    callback(err, {
      statusCode: 500,
      body: JSON.stringify({ err }),
    });
  });
}

function getIndexRequest(id, body, region) {
  const req = new AWS.HttpRequest(esEndpoint);
  req.method = 'POST';
  req.path = `/documents/doc/${id}`;
  req.body = body;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers.Host = esEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

function buildPercolatorRequest(body, region) {
  const req = new AWS.HttpRequest(esEndpoint);
  req.method = 'POST';
  req.path = '/terms/_search';
  req.body = body;
  req.region = region;
  req.headers['presigned-expires'] = false;
  req.headers.Host = esEndpoint.host;
  req.headers['Content-Type'] = 'application/json';

  return req;
}

function percolateTerms(title, contents, region, callback) {
  const from = 0; const
    size = 300;
  const percolatorQuery = {
    query: {
      percolate: {
        field: 'query',
        document: {
          contents,
          title,
        },
      },
    },
    size,
    from,
  };

  const req = buildPercolatorRequest(JSON.stringify(percolatorQuery), region);
  makePercolatorRequest(req, (err, hits) => {
    if (err === null) {
      const hitsData = hits.hits;
      const terms = hitsData.map((h) => ({
        label: h._source.query.multi_match.query,
        uri: h._id,
        source_terminology: h._source.source_terminology,
      }));

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
  client.handleRequest(req, null, (httpResp) => {
    let body = '';
    httpResp.on('data', (chunk) => {
      body += chunk;
    });

    httpResp.on('error', (err) => {
      callback(err, null);
    });

    httpResp.on('end', (chunk) => {
      console.log(`Percolator request:\n${JSON.stringify(body)}`);
      const { hits } = JSON.parse(body);
      callback(null, hits);
    });
  });
}
