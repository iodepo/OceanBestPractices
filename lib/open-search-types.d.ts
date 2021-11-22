/* eslint-disable camelcase */
import { Bitstream } from './dspace-types';

export interface DocumentItem {
  uuid: string
  lastModified: string
  bitstreams: Bitstream[]
}

export interface SearchItem {
  _id: string
  _source: DocumentItem
}

export interface SearchResponse {
  hits: {
    hits: SearchItem[]
  }
}

export interface CloseScrollResponse {
  num_freed: number
  succeeded: boolean
}

export interface ScrollResponse extends SearchResponse {
  _scroll_id: string
}
