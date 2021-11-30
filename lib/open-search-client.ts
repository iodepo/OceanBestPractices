/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import got4aws from 'got4aws';
import { get } from 'lodash';
import { percolateResponseSchema } from './schemas';

import {
  CloseScrollResponse,
  DocumentItem,
  DocumentItemTerm,
  PutDocumentItemResponse,
} from './open-search-types';

/**
 * @param prefixUrl
 * @returns {Got}
 */
const gotEs = (prefixUrl: string) => got4aws().extend({
  prefixUrl,
  responseType: 'json',
  resolveBodyOnly: true,
});

export interface OpenScrollOptions {
  includes?: string[]
  scrollTimeout?: number,
  size?: number
}

/**
 * Queries OpenSearch for all items and returns them while also
 * opening a scroll.
 * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
 * for more details.
 *
 * @param prefixUrl - Open Search endpoint.
 * @param index - Name of the index to query.
 * @param options - Options to the request.
 * @param {string[]} [options.includes=['*']] -
 *
 * @returns Open Search query results including a
 * scroll ID.
 */
export const openScroll = async (
  prefixUrl: string,
  index: string,
  options: OpenScrollOptions = {}
): Promise<unknown> => {
  const {
    includes = ['*'],
    scrollTimeout = 60,
    size = 500,
  } = options;

  return await got4aws().post(
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
 * @param prefixUrl - Open Search endpoint.
 * @param scrollId - Scroll ID of the open scroll.
 *
 * @returns Open Search query results including scroll ID. The scroll ID
 * in this response should always be used in future next scroll requests.
 */
export const nextScroll = async (
  prefixUrl: string,
  scrollId: string,
  scrollTimeout = 60
): Promise<unknown> => got4aws().post(
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

/**
 * Closes an open Open Search scroll query.
 * See https://opensearch.org/docs/latest/opensearch/rest-api/scroll/
 * for more details.
 *
 * @param prefixUrl - Open Search endpoint.
 * @param scrollId - Scroll ID of the open scroll.
 *
 * @returns Open Search close scroll response.
 */
export const closeScroll = (
  prefixUrl: string,
  scrollId: string
): Promise<CloseScrollResponse> => got4aws()
  .delete(
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
 * @param prefixUrl - Open Search endpoint.
 * @param index - Name of the index where the items exist.
 * @param ids - List of IDs to delete.
 *
 * @returns Result of Open Search bulk delete.
 */
export const bulkDelete = async (
  prefixUrl: string,
  index: string,
  ids: string[]
): Promise<CloseScrollResponse> => {
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

export interface PercolateDocumentFieldsOptions {
  from?: number
  size?: number
}

/**
 * Executes a percolator query against the terms index using the given
 * document index fields. This query takes document key/values and finds
 * the terms that match those field values. It returns a modified
 * percolator query result.
 * See https://www.elastic.co/guide/en/elasticsearch/reference/6.8/query-dsl-percolate-query.html
 * for more information.
 *
 * @param prefixUrl - Open Search endpoint.
 * @param fields - Key/value index fields to use to match
 * the percolator query.
 * @param options - Options for the request.
 *
 * @returns Modified percolator query result.
 * The result will be a list of objects that includes the matched term
 * label, uri, and source_terminology.
 */
export const percolateDocumentFields = async (
  prefixUrl: string,
  fields: { title: string, contents: string },
  options: PercolateDocumentFieldsOptions = {}
): Promise<DocumentItemTerm[]> => {
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

  const rawPercolateResponse = await got4aws().post(
    'terms/_search',
    {
      prefixUrl,
      json: body,
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );

  const percolateResponse = percolateResponseSchema
    .safeParse(rawPercolateResponse);

  if (!percolateResponse.success) {
    console.log(`ERROR: Failed to parse percolate response: ${percolateResponse.error}`);
    throw percolateResponse.error;
  }

  // It's possible we'll tweak this response as we improve the
  // percolator query. Leaving this as is for now.
  const { hits: { hits } } = percolateResponse.data;
  return hits.map((h) => ({
    label: h._source.query.multi_match.query,
    uri: h._id,
    source_terminology: h._source.source_terminology,
  }));
};

/**
 * @param prefixUrl
 * @param index
 * @returns
 */
export const getIndex = async (
  prefixUrl: string,
  index: string
): Promise<unknown> => gotEs(prefixUrl).get(index);

/**
  * @param prefixUrl
  * @param index
  * @param indexBody
  * @returns
  */
export const createIndex = (
  prefixUrl: string,
  index: string,
  indexBody?: Record<string, unknown>
): Promise<unknown> =>
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
 * Indexes an index item into the documents index.
 *
 * @param prefixUrl - Open Search endpoint.
 * @param documentItem - Object to index.
 * @returns
 */
export const putDocumentItem = async (
  prefixUrl: string,
  documentItem: DocumentItem
): Promise<PutDocumentItemResponse> => got4aws().post(
  `documents/doc/${documentItem.uuid}`,
  {
    prefixUrl,
    json: documentItem,
    responseType: 'json',
    resolveBodyOnly: true,
  }
);

/**
 * @param prefixUrl
 * @param index
 * @returns
 */
export const createTermsIndex = (
  prefixUrl: string,
  index: string
): Promise<unknown> => createIndex(prefixUrl, index, {
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
    },
  },
});

/**
 * @param {string} prefixUrl
 * @param {string} index
 * @returns {Promise<boolean>}
 */
export const indexExists = async (
  prefixUrl: string,
  index: string
): Promise<boolean> => gotEs(prefixUrl).head(index, {
  resolveBodyOnly: false,
  throwHttpErrors: false,
}).then(({ statusCode }) => statusCode === 200);
