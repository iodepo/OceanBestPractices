// @ts-check

const { default: got4aws } = require('got4aws');

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
 * @returns {Promise<unknown>} Open Search query results including a scroll ID.
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
 * @returns {Promise<unknown>} Open Search query results including scroll ID.
 * The scroll ID in this response should always be used in future next
 * scroll requests.
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
 * @returns {Promise<unknown>} Open Search close scroll response.
 */
const closeScroll = (prefixUrl, scrollId) => got4aws().delete(
  `_search/scroll/${scrollId}`,
  {
    prefixUrl,
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
 * @returns {Promise<unknown>} Result of Open Search bulk delete.
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
      resolveBodyOnly: true,
    }
  );
};

module.exports = {
  openScroll,
  nextScroll,
  closeScroll,
  bulkDelete,
};
