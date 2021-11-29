// @ts-check
const { default: got4aws } = require('got4aws');
const { get } = require('lodash');

/**
 * @typedef {import('got').Got} Got
 * @typedef {import('./open-search-types').CloseScrollResponse} CloseScrollResponse
 * @typedef {import('./open-search-types').ScrollResponse} ScrollResponse
 */

/**
 * @param {string} prefixUrl
 * @returns {Got}
 */
const gotEs = (prefixUrl) => got4aws().extend({
  prefixUrl,
  responseType: 'json',
  resolveBodyOnly: true,
});

/**
 * Queries OpenSearch for all items and returns them while also
 * opening a scroll.
 * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
 * for more details.
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {string} index - Name of the index to query.
 * @param {Object} [options={}] - Options to the request.
 * @param {string[]} [options.includes=['*']] - List of index fields
 * to include in response to the query.
 * @param {number} [options.scrollTimeout=60] - Specifies the amount of
 * time the search context is maintained.
 * @param {number} [options.size=500] - Number of results to include in a
 * a query response.
 *
 * @returns {Promise<ScrollResponse>} Open Search query results including a
 * scroll ID.
 */
const openScroll = async (prefixUrl, index, options = {}) => {
  const {
    includes = ['*'],
    scrollTimeout = 60,
    size = 500,
  } = options;

  return got4aws().post(
    `${index}/_search`,
    {
      prefixUrl,
      json: {
        scroll: `${scrollTimeout}m`,
        _source: {
          includes,
        },
        size,
      },
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );
};

/**
 * Returns search results for an open Open Search scroll.
 * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
 * for more details.
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {string} scrollId - Scroll ID of the open scroll.
 * @param {Object} [options={}] - Options to the request.
 * @param {number} [options.scrollTimeout=60] - Specifies the amount of time the
 * search context is maintained.
 *
 * @returns {Promise<ScrollResponse>} Open Search query results including
 * scroll ID. The scroll ID in this response should always be used in future
 * next scroll requests.
 */
const nextScroll = async (prefixUrl, scrollId, options = {}) => {
  const { scrollTimeout = 60 } = options;

  return got4aws().post(
    '_search/scroll',
    {
      prefixUrl,
      json: {
        scroll: `${scrollTimeout}m`,
        scroll_id: scrollId,
      },
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );
};

/**
 * Closes an open Open Search scroll query.
 * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
 * for more details.
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {string} scrollId - Scroll ID of the open scroll.
 *
 * @returns {Promise<CloseScrollResponse>} Open Search close scroll response.
 */
const closeScroll = (prefixUrl, scrollId) => got4aws().delete(
  `_search/scroll/${scrollId}`,
  {
    prefixUrl,
    responseType: 'json',
    resolveBodyOnly: true,
  }
);

/**
 * Deletes items from an Open Search index using the _bulk API.
 * See: https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {string} index - Name of the index where the items exist.
 * @param {string[]} ids - List of IDs to delete.
 *
 * @returns {Promise<CloseScrollResponse>} Result of Open Search bulk delete.
 */
const bulkDelete = async (prefixUrl, index, ids) => {
  const bulkData = ids.map((id) => ({
    delete: {
      _index: index,
      _type: '_doc',
      _id: id,
    },
  }));

  return got4aws().post(
    '_bulk',
    {
      prefixUrl,
      body: `${bulkData.map((d) => JSON.stringify(d)).join('\n')}\n`,
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );
};

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @returns {Promise<unknown>}
 */
const getIndex = async (prefixUrl, index) => gotEs(prefixUrl).get(index);

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @param {unknown} indexBody
 * @returns {Promise<unknown>}
 */
const createIndex = (prefixUrl, index, indexBody) =>
  gotEs(prefixUrl).put(
    index,
    {
      json: indexBody,
      resolveBodyOnly: false,
      throwHttpErrors: false,
    }
  ).then(({ statusCode, body }) => {
    if (statusCode === 200) return body;

    const errorMessage = get(
      body,
      'error.type',
      `Unexpected ${statusCode} response: ${body}`
    );

    throw new Error(errorMessage);
  });

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @returns {Promise<unknown>}
 */
const createTermsIndex = (prefixUrl, index) => createIndex(prefixUrl, index, {
  mappings: {
    properties: {
      contents: {
        type: 'text',
      },
      query: {
        type: 'percolator',
      },
      title: {
        type: 'text',
      },
      source_terminology: {
        type: 'keyword',
      },
      graph_uri: {
        type: 'keyword',
      },
    },
  },
});

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @returns {Promise<boolean>}
 */
const indexExists = async (prefixUrl, index) =>
  gotEs(prefixUrl).head(index, {
    resolveBodyOnly: false,
    throwHttpErrors: false,
  }).then(({ statusCode }) => statusCode === 200);

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @param {unknown} doc
 * @returns {Promise<unknown>}
 */
const addDocument = async (prefixUrl, index, doc) =>
  gotEs(prefixUrl).post(`${index}/_doc`, { json: doc });

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @param {string} id
 * @returns {Promise<unknown>}
 */
const getDocument = async (prefixUrl, index, id) =>
  gotEs(prefixUrl).get(`${index}/_doc/${id}`)
    .catch((error) => {
      const statusCode = get(error, 'response.statusCode');

      if (statusCode !== 404) throw error;
    });

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @param {unknown} query
 * @returns {Promise<unknown>}
 */
const deleteByQuery = async (prefixUrl, index, query) =>
  gotEs(prefixUrl).post(
    `${index}/_delete_by_query`,
    {
      json: { query },
    }
  );

const refreshIndex = async (prefixUrl, index) =>
  gotEs(prefixUrl).post(`${index}/_refresh`);

module.exports = {
  addDocument,
  bulkDelete,
  closeScroll,
  createIndex,
  createTermsIndex,
  deleteByQuery,
  getDocument,
  getIndex,
  indexExists,
  nextScroll,
  openScroll,
  refreshIndex,
};
