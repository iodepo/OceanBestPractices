// @ts-check
const { default: got4aws } = require('got4aws');

/**
 * @typedef {import('./open-search-types').CloseScrollResponse} CloseScrollResponse
 * @typedef {import('./open-search-types').ScrollResponse} ScrollResponse
 */

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
 * @returns {Promise<ScrollResponse<T>>} Open Search query results including a
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
 * @returns {Promise<ScrollResponse} Open Search query results including
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
 * Executes a percolator query against the terms index using the given
 * document index fields. This query takes document key/values and finds
 * the terms that match those field values. It returns a modified
 * percolator query result.
 * See https://www.elastic.co/guide/en/elasticsearch/reference/6.8/query-dsl-percolate-query.html
 * for more information.
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {Object} fields - Key/value index fields to use to match
 * the percolator query.
 * @param {Object} [options={}] - Options for the request.
 * @param {number} [options.from=0] - If paginating specify the offset of
 * results to return. Should be used with the `size` option.
 * @param {number} [options.size=300] - The number of results to return
 * in a single query.
 * @returns {Promise<Object[]>} Modified percolator query result.
 * The result will be a list of objects that includes the matched term
 * label, uri, and source_terminology.
 */
const percolateDocumentFields = async (prefixUrl, fields, options = {}) => {
  const {
    from = 0,
    size = 300,
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

  const percolateResult = await got4aws().post(
    'terms/_search',
    {
      prefixUrl,
      json: body,
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );

  // It's possible we'll tweak this response as we improve the
  // percolator query. Leaving this as is for now.
  const { hits: { hits } } = percolateResult;
  return hits.map((h) => ({
    label: h._source.query.multi_match.query,
    uri: h._id,
    source_terminology: h._source.source_terminology,
  }));
};

/**
 * Indexes an index item into the documents index.
 *
 * @param {string} prefixUrl - Open Search endpoint.
 * @param {Object} documentItem - Object to index.
 * @returns {Promise<}
 */
const putDocumentItem = async (prefixUrl, documentItem) => got4aws().post(
  `documents/doc/${documentItem.uuid}`,
  {
    prefixUrl,
    json: documentItem,
    responseType: 'json',
    resolveBodyOnly: true,
  }
);

module.exports = {
  openScroll,
  nextScroll,
  closeScroll,
  bulkDelete,
  percolateDocumentFields,
  putDocumentItem,
};
