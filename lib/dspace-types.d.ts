export interface Bitstream {
  bundleName: string
  mimeType: string
  checkSum: {
    value: string
  }
}

export interface Metadata {
  key: string,
  value: string
}

export interface DSpaceItem {
  uuid: string
  lastModified: string
  bitstreams: Bitstream[]
  metadata: Metadata[]
}
