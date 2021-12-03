import { z } from 'zod';

export const termsItemSchema = z.object({
  query: z.object({
    multi_match: z.object({
      query: z.string().min(1),
    }),
  }),
  source_terminology: z.string(),
});

export type TermItem = z.infer<typeof termsItemSchema>;

export const bitstreamSchema = z.object({
  bundleName: z.string(),
  mimeType: z.string(),
  checkSum: z.object({
    value: z.string(),
  }),
});

export type Bitstream = z.infer<typeof bitstreamSchema>;

export const documentItemTermSchema = z.object({
  label: z.string(),
  uri: z.string(),
  source_terminology: z.string(),
});

export type DocumentItemTerm = z.infer<typeof documentItemTermSchema>;

export const documentItemSchema = z.object({
  uuid: z.string().uuid(),
  lastModified: z.string(),
  bitstreams: z.array(bitstreamSchema),
  _bitstreamText: z.string().optional(),
  _terms: z.array(documentItemTermSchema).optional(),
  _dc_title: z.string(),
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
