import {
  SET_SEARCH,
  CLEAR_SEARCH_TERM,
  CLEAR_ALL_SEARCH,
  SEARCH_UPDATE_OPERATOR,
  SEARCH_HAS_ERRORED,
  SEARCH_IS_LOADING,
  SEARCH_FETCH_DATA_SUCCESS,
  SEARCH_SET_FILTER,
  SEARCH_CLEAR_FILTERS,
} from '../types/search';

import { resetTerms } from './terms';
import { resetRelationships } from './relationships'

import delayPromise from '../helpers/delayPromise';
import convertFiltersToString from '../helpers/convertFiltersToString';
import { createAPISearchURL } from '../helpers/api';
import { deconstructQuery } from '../helpers/query';

// responseDelay will delay the api response resolve by the indicated time in ms for help with debugging.
// This should always be set to 0 after developement.

const responseDelay = 0;


// Updates the search input state to a new value

export const setSearch = (search, activeSearch) => {
  return {
    type: SET_SEARCH,
    payload: {
      search,
      activeSearch,
    }
  };
};

export const clearAllSearch = () => {
  return {
    type: CLEAR_ALL_SEARCH,
  };
};

export const clearSearch = () => {
  return setSearch('');
};

export const clearActiveSearch = () => {
  return setSearch('', []);
};

export const clearSearchTerm = (tag_index) => {
  return {
    type: CLEAR_SEARCH_TERM,
    payload: {
      tag_index,
    }
  };
};

export const searchUpdateOperator = (tag_index, operator) => {
  return {
    type: SEARCH_UPDATE_OPERATOR,
    payload: {
      tag_index,
      operator,
    }
  };
};


// Hit the api for the search term(s)

export const getSearch = (query, options = {}) => {

  let searchOptions = {
    termURI: false,
    term: false,
    ...options
  }

  return (dispatch, getState) => {

    const state = getState();
    const search = query || state.searchReducer.search;
    const search_group = deconstructQuery(search, state.searchReducer.activeSearch);
    const active_field = state.fields.filter(field => !!(field.active_search))[0];

    let options = {};

    // If we don't have an active search query or group, we really shouldn't be requesting
    // anything as there's nothing to request. Let's return out of this and also clean up
    // our app state to make sure we don't have stale data hanging around

    if ( !search && search_group.length === 0 ) {
      dispatch(resetTerms());
      dispatch(clearAllSearch());
      return;
    }

    state.options.forEach(option => {
      options[option.id] = option.value;
    });

    searchOptions = Object.assign({}, searchOptions, options);

    if ( searchOptions.resetRelationships ) {
      dispatch(resetRelationships());
      dispatch(searchClearFilters());
    }

    searchOptions.termURI = convertFiltersToString(state.searchReducer.activeFilters);
    searchOptions.fields = active_field && active_field.value;

    const url = createAPISearchURL(search_group, searchOptions);
    
    if(searchOptions.resetTerms === true) {
      dispatch(resetTerms());
    }
    dispatch(setSearch('', search_group));
    dispatch(searchIsLoading(true));

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then(delayPromise(responseDelay))
      .then((response) => {
        dispatch(searchIsLoading(false));
        return response;
      })
      .then((response) => {
        response = {
          ...response,
          activePage: Math.ceil(searchOptions.offset / searchOptions.size) + 1
        }

        dispatch(searchFetchDataSuccess(response))
      })
      .catch((error) => dispatch(searchHasErrored(true)))
    }
};

export function searchHasErrored(bool) {
  return {
    type: SEARCH_HAS_ERRORED,
    hasErrored: bool
  };
}

export function searchIsLoading(bool) {
  return {
    type: SEARCH_IS_LOADING,
    isLoading: bool
  };
}

export function searchFetchDataSuccess(response) {
  return {
    type: SEARCH_FETCH_DATA_SUCCESS,
    response,
  };
}

export function searchSetFilter(filter, label, bool) {
  return {
    type: SEARCH_SET_FILTER,
    filter,
    label,
    bool
  };
}

export function searchClearFilters() {
  return {
    type: SEARCH_CLEAR_FILTERS,
  };
}
