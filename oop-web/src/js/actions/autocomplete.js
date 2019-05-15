import {
  AUTOCOMPLETE_HAS_ERRORED,
  AUTOCOMPLETE_IS_LOADING,
  AUTOCOMPLETE_FETCH_DATA_SUCCESS,
  AUTOCOMPLETE_IS_SELECTED
} from '../types/autocomplete';

import { createAPIAutocompleteURL } from '../helpers/api';
import { optionById } from '../helpers/options';


export const getAutocomplete = (query) => {

  return (dispatch, getState) => {
    let state = getState();
    let synonyms = optionById(state.options, 'synonyms').value;

    const url = createAPIAutocompleteURL(query, synonyms);

    dispatch(autocompleteIsSelected(false));
    dispatch(autocompleteIsLoading(true));
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then((response) => {
        dispatch(autocompleteIsLoading(false));
        return response.splice(0, 20);
      })
      .then((response) => {
        dispatch(autocompleteFetchDataSuccess(query, response))
      })
      .catch((error) => dispatch(autocompleteHasErrored(true)))
    }
};


export function autocompleteHasErrored(bool) {
  return {
    type: AUTOCOMPLETE_HAS_ERRORED,
    hasErrored: bool
  };
}

export function autocompleteIsLoading(bool) {
  return {
    type: AUTOCOMPLETE_IS_LOADING,
    isLoading: bool
  };
}

export function autocompleteFetchDataSuccess(query, response) {
  return {
    type: AUTOCOMPLETE_FETCH_DATA_SUCCESS,
    query,
    response,
  };
}

export function autocompleteIsSelected(bool) {
  return {
    type: AUTOCOMPLETE_IS_SELECTED,
    isSelected: bool
  };
}
