import {
  STATS_HAS_ERRORED,
  STATS_IS_LOADING,
  STATS_FETCH_DATA_SUCCESS,
} from '../types/stats';

const initialState = {
  stats: {
    documents: null,
    ontologies: null,
    terms: null
  },
  isLoading: false,
  hasErrored: false
};

export default (state = initialState, action) => {
  switch (action.type) {
    case STATS_FETCH_DATA_SUCCESS:

      const documents = action.response.documents.count;
      const ontologies = action.response.ontologies.count;
      const terms = action.response.ontologies.terms.count;

      return {
        ...state,
        stats: {
          documents,
          ontologies,
          terms
        }
      };
    case STATS_HAS_ERRORED:
      return {
        ...state,
        hasErrored: action.hasErrored,
        isLoading: false
      };
    case STATS_IS_LOADING:
      return {
        ...state,
        isLoading: action.isLoading,
      };
    default:
      return state;
  }
}
