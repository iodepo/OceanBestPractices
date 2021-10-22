import {
  TAGS_HAS_ERRORED,
  TAGS_IS_LOADING,
  TAGS_FETCH_DATA_SUCCESS,
  TAGS_CSV_HAS_ERRORED,
  TAGS_CSV_IS_LOADING,
  TAGS_CSV_FETCH_DATA_SUCCESS,
} from '../types/tagger';

import { createAPITaggerURL, createAPITaggerCSVURL } from '../helpers/api';


// Hit the api for the JSON tags for the OceanKnowledge Tagger

export const getTags = (docTitle, docContent) => {

  const url = createAPITaggerURL();

  return dispatch => {
    dispatch(tagsIsLoading(true));
    fetch(url, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      method: "POST",
      body: JSON.stringify({title: docTitle, contents: docContent})
    })
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then((response) => {
        dispatch(tagsIsLoading(false));
        return response;
      })
      .then((response) => {
        dispatch(tagsFetchDataSuccess(response))
      })
      .catch((error) => dispatch(tagsHasErrored(true)))
    }
};

// Hit the api for the CSV tags for the OceanKnowledge Tagger

export const getTagsCSV = (docTitle, docContent) => {

  const url = createAPITaggerCSVURL();

  return dispatch => {
    dispatch(tagsIsLoading(true));
    fetch(url, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/csv' },
      method: "POST",
      body: JSON.stringify({title: docTitle, contents: docContent})
    })
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.text())
      .then((response) => {
        dispatch(tagsCSVIsLoading(false));
        return response;
      })
      .then((response) => {
        dispatch(tagsCSVFetchDataSuccess(response))
      })
      .catch((error) => dispatch(tagsCSVHasErrored(true)))
    }
};

export function tagsHasErrored(bool) {
  return {
    type: TAGS_HAS_ERRORED,
    hasErrored: bool
  };
}

export function tagsIsLoading(bool) {
  return {
    type: TAGS_IS_LOADING,
    isLoading: bool
  };
}

export function tagsFetchDataSuccess(response) {
  return {
    type: TAGS_FETCH_DATA_SUCCESS,
    response,
  };
}

export function tagsCSVHasErrored(bool) {
  return {
    type: TAGS_CSV_HAS_ERRORED,
    hasErrored: bool
  };
}

export function tagsCSVIsLoading(bool) {
  return {
    type: TAGS_CSV_IS_LOADING,
    isLoading: bool
  };
}

export function tagsCSVFetchDataSuccess(response) {
  return {
    type: TAGS_CSV_FETCH_DATA_SUCCESS,
    response,
  };
}
