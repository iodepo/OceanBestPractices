/* eslint-disable no-underscore-dangle */
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
const { Sha256 } = require('@aws-crypto/sha256-browser');

/**
 * Signs and executes a request against Open Search. This code
 * was copied (mostly) from https://docs.aws.amazon.com/opensearch-service/latest/developerguide/request-signing.html#request-signing-node
 *
 * @param {string} endpoint Open Search endpoint with or without protocol.
 * @param {string} path Path of the Open Search request.
 * @param {Object} body Body of the Open Search request.
 * @param {Object} [options={}] Options to configure the request..
 * @param {Object} [options.method=GET] HTTP method to use for the request.
 * @param {Object} [options.region=us-east-1] Region in which the Open Search
 * cluster exists.
 *
 * @returns {Promise<Object>} Open Search response for the given request.
 */
const signAndRequest = async (endpoint, path, body, options = {}) => {
  const {
    method = 'GET',
    region = 'us-east-1',
  } = options;

  const endpointWithoutProtocol = endpoint.replace(/^https?:\/\//, '');

  // Create the HTTP request
  const request = new HttpRequest({
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      host: endpointWithoutProtocol,
    },
    hostname: endpointWithoutProtocol,
    method,
    path,
  });

  // Sign the request
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 'es',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  // Send the request
  const client = new NodeHttpHandler();
  const { response } = await client.handle(signedRequest);
  console.log(`${response.statusCode} ${response.body.statusMessage}`);
  let responseBody = '';
  await new Promise((resolve) => {
    response.body.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.body.on('end', () => {
      console.log(`Response body: ${responseBody}`);
      resolve(responseBody);
    });
  }, (error) => {
    console.log(`Error: ${error}`);
  });

  return JSON.parse(responseBody);
};

module.exports = {
  /**
   * Queries OpenSearch for all items and returns them while also
   * opening a scroll.
   * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
   * for more details.
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {string} index Name of the index to query.
   * @param {Object} [options={}] Options to the request.
   * @param {Object} [options.includes=['*']] List of index fields
   * to include in response to the query.
   * @param {Object} [options.region=us-east-1] Region in which the
   * Open Search index exists.
   * @param {Object} [options.scrollTimeout=60] Specifies the amount of
   * time the search context is maintained.
   * @param {Object} [options.size=500] Number of results to include in a
   * a query response.
   *
   * @returns {Promise<Object>} Open Search query results including a scroll ID.
   */
  openScroll: async (endpoint, index, options = {}) => {
    const {
      includes = ['*'],
      region = 'us-east-1',
      scrollTimeout = 60,
      size = 500,
    } = options;

    const body = {
      _source: {
        includes,
      },
      size,
    };

    return signAndRequest(
      endpoint,
      `${index}/_search?scroll=${scrollTimeout}m`,
      body,
      { region }
    );
  },

  /**
   * Returns search results for an open Open Search scroll.
   * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
   * for more details.
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {string} scrollId Scroll ID of the open scroll.
   * @param {Object} [options={}] Options to the request.
   * @param {string} [options.region=us-east-1] Region in which the Open Search
   * cluster exists.
   * @param {number} [options.scrollTimeout=60] Specifies the amount of time the
   * search context is maintained.
   *
   * @returns {Promise<Object>} Open Search query results including scroll ID.
   * The scroll ID in this response should always be used in future next
   * scroll requests.
   */
  nextScroll: async (endpoint, scrollId, options = {}) => {
    const {
      region = 'us-east-1',
      scrollTimeout = 60,
    } = options;

    const body = {
      scroll: `${scrollTimeout}m`,
      scroll_id: scrollId,
    };

    return signAndRequest(
      endpoint,
      '_search/scroll',
      body,
      { region }
    );
  },

  /**
   * Closes an open Open Search scroll query.
   * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
   * for more details.
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {string} scrollId Scroll ID of the open scroll.
   * @param {Object} [options={}] Options to the request.
   * @param {string} [options.region=us-east-1] Region in which
   * the Open Search cluster exists.
   *
   * @returns {Promise<Object>} Open Search close scroll response.
   */
  closeScroll: async (endpoint, scrollId, options = {}) => {
    const {
      region = 'us-east-1',
    } = options;

    return signAndRequest(
      endpoint,
      `_search/scroll/${scrollId}`,
      undefined,
      {
        method: 'DELETE',
        region,
      }
    );
  },

  /**
   * Deletes items from an Open Search index using the _bulk API.
   * See: https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {string} index Name of the index where the items exist.
   * @param {string[]} ids List of IDs to delete.
   * @param {Object} [options={}] Options for the request.
   * @param {string} [options.region=us-east-1] Region in which the Open
   * Search cluster exists.
   *
   * @returns {Promise<Object>} Result of Open Search bulk delete.
   */
  bulkDelete: async (endpoint, index, ids, options = {}) => {
    const {
      region = 'us-east-1',
    } = options;

    const bulkData = ids.map((id) => ({
      delete: {
        _index: index,
        _type: '_doc',
        _id: id,
      },
    }));

    const body = `${bulkData.map((d) => JSON.stringify(d)).join('\n')}\n`;

    const params = {
      method: 'POST',
      region,
    };

    return signAndRequest(
      endpoint,
      '_bulk',
      body,
      params
    );
  },

  /**
   * Executes a percolator query against the terms index using the given
   * document index fields. This query takes document key/values and finds
   * the terms that match those field values. It returns a modified
   * percolator query result.
   * See https://www.elastic.co/guide/en/elasticsearch/reference/6.8/query-dsl-percolate-query.html
   * for more information.
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {Object} fields Key/value index fields to use to match
   * the percolator query.
   * @param {Object} [options={}] Options for the request.
   * @param {string} [options.region=us-east-1] Region in which the Open
   * Search cluster exists.
   * @param {number} [options.from=0] If paginating specify the offset of
   * results to return. Should be used with the `size` option.
   * @param {number} [options.size=300] The number of results to return
   * in a single query.
   * @returns {Promise<Object[]>} Modified percolator query result.
   * The result will be a list of objects that includes the matched term
   * label, uri, and source_terminology.
   */
  percolateDocumentFields: async (endpoint, fields, options = {}) => {
    const {
      from = 0,
      size = 300,
      region = 'us-east-1',
    } = options;

    const body = {
      query: {
        percolate: {
          field: 'query',
          document: {
            ...fields,
          },
        },
      },
      from,
      size,
    };

    const params = {
      method: 'POST',
      region,
    };

    const percolateResult = await signAndRequest(
      endpoint,
      'terms/_search',
      body,
      params
    );

    // It's possible we'll tweak this response as we improve the
    // percolator query. Leaving this as is for now.
    const { hits: { hits } } = percolateResult;
    return hits.map((h) => ({
      label: h._source.query.multi_match.query,
      uri: h._id,
      source_terminology: h._source.source_terminology,
    }));
  },

  /**
   * Indexes an index item into the documents index.
   *
   * @param {string} endpoint Open Search endpoint.
   * @param {string} id ID used for the document identifier
   * instead of the default OpenSearch ID.
   * @param {Object} indexItem Object to index.
   * @param {Object} [options={}] Options for the request.
   * @param {string} [options.region=us-east-1] Region in which the Open
   * Search cluster exists.
   * @returns
   */
  putDocumentItem: async (endpoint, documentItem, options = {}) => {
    const {
      region = 'us-east-1',
    } = options;

    const params = {
      method: 'POST',
      region,
    };

    return signAndRequest(
      endpoint,
      `documents/doc/${documentItem.uuid}`,
      documentItem,
      params
    );
  },
};
