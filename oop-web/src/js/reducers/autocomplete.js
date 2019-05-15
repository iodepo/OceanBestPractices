import {
  AUTOCOMPLETE_HAS_ERRORED,
  AUTOCOMPLETE_IS_LOADING,
  AUTOCOMPLETE_FETCH_DATA_SUCCESS,
  AUTOCOMPLETE_IS_SELECTED
} from '../types/autocomplete';

const initialState = {
  query: '',
  results: [],
  isSelected: false,
  isLoading: false,
  hasErrored: false
};

export default (state = initialState, action) => {
  switch (action.type) {
    case AUTOCOMPLETE_FETCH_DATA_SUCCESS:
      return {
        ...state,
        results: action.response,
        query: action.query
      };
    case AUTOCOMPLETE_HAS_ERRORED:
      return {
        ...state,
        hasErrored: action.hasErrored,
        isLoading: false
      };
    case AUTOCOMPLETE_IS_LOADING:
      return {
        ...state,
        isLoading: action.isLoading,
      };
    case AUTOCOMPLETE_IS_SELECTED:
      return {
        ...state,
        results: [],
        isSelected: action.isSelected
      };
    default:
      return state;
  }
}
