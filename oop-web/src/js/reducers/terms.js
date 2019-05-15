import {
  SET_TERMS,
  RESET_TERMS
} from '../types/terms';

const initialState = {
  activeTerms: {
    title: null,
    id: null,
    terms: []
  },
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_TERMS :
      return {
        ...state,
        activeTerms: action.payload.activeTerms
      };
    case RESET_TERMS :
      return {
        ...state,
        activeTerms: {
          title: null,
          id: null,
          terms: []
        },
      };
    default:
      return state;
  }
}
