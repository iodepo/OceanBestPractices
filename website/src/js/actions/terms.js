import {
  SET_TERMS,
  RESET_TERMS
} from '../types/terms';

export const setTerms = (terms) => {
  return dispatch => {
    dispatch({
      type: SET_TERMS,
      payload: {
        activeTerms: terms
      }
    });
  };
};

export const resetTerms = () => {
  return dispatch => {
    dispatch({
      type: RESET_TERMS,
    });
  };
};
