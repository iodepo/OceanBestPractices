import {
  TAGS_HAS_ERRORED,
  TAGS_IS_LOADING,
  TAGS_FETCH_DATA_SUCCESS,
  TAGS_CSV_HAS_ERRORED,
  TAGS_CSV_IS_LOADING,
  TAGS_CSV_FETCH_DATA_SUCCESS,
} from '../types/tagger';

const initialState = {
  items: [],
  isLoading: false,
  hasErrored: false,
  itemsCSV: [],
  csvLoading: false,
  csvErrored: false,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TAGS_FETCH_DATA_SUCCESS:

      return {
        ...state,
        items: action.response
      };
    case TAGS_HAS_ERRORED:
      return {
        ...state,
        hasErrored: action.hasErrored,
        isLoading: false
      };
    case TAGS_IS_LOADING:
      return {
        ...state,
        isLoading: action.isLoading,
      };
    case TAGS_CSV_FETCH_DATA_SUCCESS:

      return {
        ...state,
        itemsCSV: action.response
      };
    case TAGS_CSV_HAS_ERRORED:
      return {
        ...state,
        csvErrored: action.hasErrored,
        csvLoading: false
      };
    case TAGS_CSV_IS_LOADING:
      return {
        ...state,
        csvLoading: action.isLoading,
      };
    default:
      return state;
  }
}
