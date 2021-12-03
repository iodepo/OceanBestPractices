import { z } from 'zod';

export const bitstreamSchema = z.object({
  bundleName: z.string(),
  mimeType: z.string(),
  checkSum: z.object({
    value: z.string(),
  }).passthrough(),
  retrieveLink: z.string(),
});

export type Bitstream = z.infer<typeof bitstreamSchema>;

// export interface Bitstream {
//   uuid: string
//   name: string
//   handle: string | null
//   type: string
//   expand: string[]
//   description: string | null
//   format: string
//   sizeBytes: number
//   parentObject: unknown | null
//   retrieveLink: string
//   bundleName: string
//   mimeType: string
//   checkSum: {
//     value: string
//     checkSumAlgorithm: string
//   }
//   sequenceId: number
//   policies: unknown | null
//   link: string
// }

export const metadataSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type Metadata = z.infer<typeof metadataSchema>;

// export interface Metadata {
//   key: string,
//   value: string,
//   language: string,
//   element: string,
//   qualifier: string | null,
//   schema: string,
// }

export const dspaceItemSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  handle: z.string(),
  lastModified: z.string(),
  bitstreams: z.array(bitstreamSchema.passthrough()),
  metadata: z.array(metadataSchema),
});

export type DSpaceItem = z.infer<typeof dspaceItemSchema>;

// export interface DSpaceItem {
//   uuid: string
//   name: string
//   handle: string
//   type: string
//   expand: string[]
//   lastModified: string
//   bitstreams: Bitstream[]
//   metadata: Metadata[]
//   parentCollection: unknown
//   parentCollectionList: unknown
//   parentCommunityList: unknown
//   archived: string
//   withdrawn: string
//   link: string
// }

export const rssFeedSchema = z.object({
  channel: z.array(
    z.object({
      pubDate: z.array(
        z.object({
          _: z.string(),
        })
      ),
      item: z.array(
        z.object({
          link: z.array(z.string()),
          pubDate: z.array(z.string()),
        })
      ),
    })
  ),
});

export type RSSFeed = z.infer<typeof rssFeedSchema>;
