export interface Bitstream {
  uuid: string
  name: string
  handle: string | null
  type: string
  expand: string[]
  description: string | null
  format: string
  sizeBytes: number
  parentObject: unknown | null
  retrieveLink: string
  bundleName: string
  mimeType: string
  checkSum: {
    value: string
    checkSumAlgorithm: string
  }
  sequenceId: number
  policies: unknown | null
  link: string
}

export interface Metadata {
  key: string,
  value: string,
  language: string,
  element: string,
  qualifier: string | null,
  schema: string,
}

export interface DSpaceItem {
  uuid: string
  name: string
  handle: string
  type: string
  expand: string[]
  lastModified: string
  bitstreams: Bitstream[]
  metadata: Metadata[]
  parentCollection: unknown | null
  parentCollectionList: unknown | null
  parentCommunityList: unknown | null
  archived: string
  withdrawn: string
  link: string
}

export interface RSSFeed {
  channel: [
    {
      pubDate: [
        {
          _: string
        }
      ],
      item: [
        {
          link: string[]
          pubDate: string[]
        }
      ]
    }
  ],
}
