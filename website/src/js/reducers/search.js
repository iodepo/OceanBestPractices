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

const initialState = {
  search: '',
  activeSearch: [],
  sort: 'dc_date_issued:desc',
  activePage: undefined,
  activeFilters: {},
  hasErrored: false,
  hasSearched: false,
  items: [],
  isLoading: false,
  totalResults: 0
};

export default (state = initialState, action) => {

  switch (action.type) {
    case SET_SEARCH :
      return {
        ...state,
        search: action.payload.search,
        activeSearch: action.payload.activeSearch || state.activeSearch,
      };
    case CLEAR_ALL_SEARCH :
      return {
        ...state,
        search: '',
        activeSearch: [],
        activeFilters: {},
        items: [],
        hasSearched: false,
      };
    case CLEAR_SEARCH_TERM :
      return {
        ...state,
        activeSearch: reduceClearSearchTerm(state.activeSearch, action.payload.tag_index),
      };
    case SEARCH_UPDATE_OPERATOR:
      return {
        ...state,
        activeSearch: reduceUpdateOperator(state.activeSearch, action.payload.tag_index, action.payload.operator)
      }
    case SEARCH_FETCH_DATA_SUCCESS:
      return {
        ...state,
        items: action.response.hits.hits,
        activePage: action.response.activePage,
        totalResults: action.response.hits.total.value
      };
    case SEARCH_HAS_ERRORED:
      return {
        ...state,
        hasErrored: action.hasErrored,
        isLoading: false
      };
    case SEARCH_IS_LOADING:
      return {
        ...state,
        isLoading: action.isLoading,
        items: [],
        hasSearched: true
      };
    case SEARCH_SET_FILTER:
      return {
        ...state,
        activeFilters: reduceActiveFilters(state.activeFilters, action),
      }
    case SEARCH_CLEAR_FILTERS:
      return {
        ...state,
        activeFilters: {},
      }
    default:
      return state;
  }
}


/**
 * reduceActiveFilters
 * @description Takes the active filters and optionally a new filter and removes inactive
 */

function reduceUpdateOperator(active_search = [], index, operator) {

  if ( !active_search[index] ) return active_search;

  let query = active_search.map((term) => Object.assign({}, term));

  query[index].operator = operator;

  return query;

}


/**
 * reduceActiveFilters
 * @description Takes the active filters and optionally a new filter and removes inactive
 */

function reduceActiveFilters(filters = {}, action) {

  const filter_object = {};

  for ( let key in filters ) {

    if (key === action.filter && !action.bool) continue;

    filter_object[key] = Object.assign({}, filters[key]);

  }

  if ( typeof action !== 'object' || !action.bool ) return filter_object;

  filter_object[action.filter] = {
    filter: action.filter,
    label: action.label,
    active: action.bool,
  }

  return filter_object;

}


/**
 * reduceClearSearchTerm
 * @description Removes a search term from the activeSearch query group
 */

function reduceClearSearchTerm(active_search = [], tag_index) {

  if ( Number.isNaN(tag_index) ) return active_search;
  if ( !Array.isArray(active_search) || active_search.length === 1 ) return [];

  active_search.splice(tag_index, 1);

  return active_search.map((segment, index) => {
    return {
      ...segment,
      index
    }
  });

}
