/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import got4aws from 'got4aws';
import { z } from 'zod';

import {
  CloseScrollResponse,
  DocumentItem,
  DocumentItemTerm,
  PutDocumentItemResponse,
  ScrollResponse,
} from './open-search-types';

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
 *
 * @returns Open Search query results including a
 * scroll ID.
 */
export const openScroll = async<T> (
  prefixUrl: string,
  index: string,
  options: OpenScrollOptions = {}
): Promise<ScrollResponse<T>> => {
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
 * @param prefixUrl - Open Search endpoint.
 * @param scrollId - Scroll ID of the open scroll.
 *
 * @returns Open Search query results including scroll ID. The scroll ID
 * in this response should always be used in future next scroll requests.
 */
export const nextScroll = async<T> (
  prefixUrl: string,
  scrollId: string,
  scrollTimeout = 60
): Promise<ScrollResponse<T>> => got4aws().post(
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

  const percolateResponseSchema = z.object({
    hits: z.object({
      hits: z.array(
        z.object({
          _id: z.string(),
          _source: z.object({
            query: z.object({
              multi_match: z.object({
                query: z.string(),
              }),
            }),
            source_terminology: z.string(),
          }),
        })
      ),
    }),
  });

  const rawPercolateResponse = await got4aws().post(
    'terms/_search',
    {
      prefixUrl,
      json: body,
      responseType: 'json',
      resolveBodyOnly: true,
    }
  );

  try {
    const percolateResponse = percolateResponseSchema
      .parse(rawPercolateResponse);

    // It's possible we'll tweak this response as we improve the
    // percolator query. Leaving this as is for now.
    const { hits: { hits } } = percolateResponse;
    return hits.map((h) => ({
      label: h._source.query.multi_match.query,
      uri: h._id,
      source_terminology: h._source.source_terminology,
    }));
  } catch (error) {
    console.log(`ERROR: Failed to parse percolate response: ${error}`);
    throw error;
  }
};

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
