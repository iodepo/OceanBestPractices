import { z } from 'zod';

export const bitstreamSchema = z.object({
  bundleName: z.string(),
  mimeType: z.string(),
  checkSum: z.object({
    value: z.string(),
  }).passthrough(),
  retrieveLink: z.string(),
}).passthrough();

export type Bitstream = z.infer<typeof bitstreamSchema>;

export const metadataSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
}).passthrough();

export type Metadata = z.infer<typeof metadataSchema>;

export const dspaceItemSchema = z.object({
  uuid: z.string().uuid(),
  handle: z.string(),
  lastModified: z.string(),
  bitstreams: z.array(bitstreamSchema),
  metadata: z.array(metadataSchema),
}).passthrough();

export type DSpaceItem = z.infer<typeof dspaceItemSchema>;

export const rssFeedSchema = z.object({
  channel: z.array(
    z.object({
      pubDate: z.array(
        z.object({
          _: z.string(),
        })
      ).nonempty(),
      item: z.array(
        z.object({
          link: z.array(z.string()),
          pubDate: z.array(z.string()),
        })
      ).nonempty(),
    })
  ).nonempty(),
});

export type RSSFeed = z.infer<typeof rssFeedSchema>;
