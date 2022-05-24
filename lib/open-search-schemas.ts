import { z } from 'zod';
import { dspaceItemSchema } from './dspace-schemas';

export const termsItemSchema = z.object({
  query: z.object({
    multi_match: z.object({
      query: z.string().min(1),
    }),
  }),
  source_terminology: z.string(),
  uri: z.string().url(),
  namedGraphUri: z.string().url(),
  label: z.string().min(1),
  suggest: z.array(z.string().min(1)).min(1),
});

export type TermItem = z.infer<typeof termsItemSchema>;

export const documentItemTermSchema = z.object({
  label: z.string(),
  uri: z.string(),
  source_terminology: z.string(),
});

export type DocumentItemTerm = z.infer<typeof documentItemTermSchema>;

export const documentItemSchema = dspaceItemSchema.extend({
  bitstreamText: z.string().optional(),
  primaryAuthor: z.string().optional(),
  terms: z.array(documentItemTermSchema).optional(),
  dc_title: z.string(),
});

export type DocumentItem = z.infer<typeof documentItemSchema>;

export const openSearchResultsSchema = <T extends z.ZodTypeAny>(
  sourceSchema: T
) => z.object({
    hits: z.object({
      total: z.object({
        value: z.number(),
      }),
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

export const documentsSearchResponseSchema = openSearchResultsSchema(documentItemSchema);

export type DocumentsSearchResponse = z.infer<typeof documentsSearchResponseSchema>;

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

export const countResponseSchema = z.object({
  count: z.number(),
});

export const suggestTermsResponseSchema = z.object({
  suggest: z.object({
    termSuggest: z.array(
      z.object({
        options: z.array(z.object({
          text: z.string().min(1),
        })),
      })
    ).min(1),
  }),
});
