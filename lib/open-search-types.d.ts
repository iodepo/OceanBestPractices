/* eslint-disable camelcase */
import { Bitstream } from './dspace-types';

export interface DocumentItem {
  uuid: string
  lastModified: string
  bitstreams: Bitstream[]
}

export interface DocumentItemTerm {
  label: string,
  uri: string,
  source_terminology: string
}

export interface TermItem {
  query: string
}

export interface PutDocumentItemResponse {
  _index: string,
  _id: string,
}

export interface SearchItem<T> {
  _id: string
  _source: T
}

export interface SearchResponse<T> {
  hits: {
    hits: SearchItem<T>[]
  }
}

export interface CloseScrollResponse {
  num_freed: number
  succeeded: boolean
}

export interface ScrollResponse<T> extends SearchResponse<T> {
  _scroll_id: string
}

export type DocumentsScrollResponse = ScrollResponse<DocumentItem>

// export interface PutDocumentResponse {

// }
