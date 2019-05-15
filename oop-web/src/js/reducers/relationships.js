import {
  SET_RELATIONSHIPS,
  RESET_RELATIONSHIPS,
  RELATIONSHIPS_HAS_ERRORED,
  RELATIONSHIPS_IS_LOADING,
  RELATIONSHIPS_FETCH_DATA_SUCCESS,
} from '../types/relationships';

const initialState = {
  activeRelationships: false,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_RELATIONSHIPS :
      return {
        ...state,
        activeRelationships: action.payload.activeRelationships
      };
    case RESET_RELATIONSHIPS :
      return {
        ...state,
        activeRelationships: false
      };
    case RELATIONSHIPS_FETCH_DATA_SUCCESS:
      return {
        ...state,
        title: action.response.title,
        activeRelationships: action.response.activeRelationships
      };
    case RELATIONSHIPS_HAS_ERRORED:
      return {
        ...state,
        hasErrored: action.hasErrored,
        isLoading: false
      };
    case RELATIONSHIPS_IS_LOADING:
      return {
        ...state,
        activeSearch: state.search,
        isLoading: action.isLoading,
      };
    default:
      return state;
  }
}
