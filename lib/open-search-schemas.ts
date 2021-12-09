/* eslint-disable camelcase */
import { z } from 'zod';
import { dspaceItemSchema } from './dspace-schemas';

export const termsItemSchema = z.object({
  query: z.object({
    multi_match: z.object({
      query: z.string().min(1),
    }),
  }),
  source_terminology: z.string(),
  uri: z.string(),
});

export type TermItem = z.infer<typeof termsItemSchema>;

export const documentItemTermSchema = z.object({
  label: z.string(),
  uri: z.string(),
  source_terminology: z.string(),
});

export type DocumentItemTerm = z.infer<typeof documentItemTermSchema>;

export const documentItemSchema = dspaceItemSchema.extend({
  _bitstreamText: z.string().optional(),
  _primaryAuthor: z.string().optional(),
  _terms: z.array(documentItemTermSchema).optional(),
  dc_title: z.string(),
});

export type DocumentItem = z.infer<typeof documentItemSchema>;

export const openSearchResultsSchema = <T extends z.ZodTypeAny>(
  sourceSchema: T
) => z.object({
    hits: z.object({
      hits: z.array(
        z.object({
          _id: z.string(),
          _source: sourceSchema,
        })
      ),
    }),
  });

export const openSearchScrollDocumentsResponseSchema = openSearchResultsSchema(
  documentItemSchema
).extend({
  _scroll_id: z.string(),
});

export const percolateResponseSchema = openSearchResultsSchema(termsItemSchema);

export type PercolateResponse = z.infer<typeof percolateResponseSchema>;

export const closeScrollResponseSchema = z.object({
  succeeded: z.boolean(),
  num_freed: z.number(),
});

export const putDocumentItemResponseSchema = z.object({
  _index: z.string(),
  _id: z.string(),
  _type: z.string(),
  _version: z.number(),
  result: z.string(),
  _shards: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
  }),
  _seq_no: z.number(),
  _primary_term: z.number(),
});

export type PutDocumentItemResponse =
  z.infer<typeof putDocumentItemResponseSchema>

export type CloseScrollResponse = z.infer<typeof closeScrollResponseSchema>;

// Document searching.
export interface DocumentSearchRequestNestedQuery {
  nested: {
    path: 'terms',
    query: {
      bool: {
        must: {
          match_phrase: Record<string, string>
        }
      }
    }
  }
}

export interface DocumentSearchRequestQuery {
  bool: {
    must: {
      query_string: {
        fields: string[],
        query: string
      }
    },
    // DocumentSearchRequestNestedQuery[] | { term: { refereed: 'Refereed' } }?
    filter?: unknown
  }
}

export interface DocumentSearchRequestBody {
  _source: {
    excludes: string[]
  }
  from: number
  size: number
  query: DocumentSearchRequestQuery
  highlight: {
    fields: {
      _bitstreamText: Record<string, unknown>
    }
  }
  // TODO: Figure out how to type the sort field.
  // See: https://www.elastic.co/guide/en/elasticsearch/reference/current/sort-search-results.html
  sort: unknown
}
