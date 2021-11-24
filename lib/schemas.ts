import { z } from 'zod';

export const termsItemSchema = z.object({
  query: z.object({
    multi_match: z.object({
      query: z.string(),
    }),
  }),
  source_terminology: z.string(),
});

export type TermsItem = z.infer<typeof termsItemSchema>;

export const bitstreamSchema = z.object({
  bundleName: z.string(),
  mimeType: z.string(),
  checkSum: z.object({
    value: z.string(),
  }),
});

export type Bitstream = z.infer<typeof bitstreamSchema>;

export const documentsItemSchema = z.object({
  uuid: z.string(),
  lastModified: z.string(),
  bitstreams: z.array(bitstreamSchema),
});

export type DocumentsItem = z.infer<typeof documentsItemSchema>;

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
  documentsItemSchema
).extend({
  _scroll_id: z.string(),
});

export const percolateResponseSchema = openSearchResultsSchema(termsItemSchema);

export type PercolateResponse = z.infer<typeof percolateResponseSchema>;
