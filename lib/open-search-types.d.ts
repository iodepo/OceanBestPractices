/* eslint-disable camelcase */
import { Bitstream } from './dspace-types';

export interface SearchItem<T> {
  _id: string
  _source: T
}

export interface SearchResponse<T> {
  hits: {
    hits: SearchItem<T>[]
  }
}
export interface ScrollResponse<T> extends SearchResponse<T> {
  _scroll_id: string
}

export type DocumentsScrollResponse = ScrollResponse<DocumentItem>
