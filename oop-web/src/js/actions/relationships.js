import {
  SET_RELATIONSHIPS,
  RESET_RELATIONSHIPS,
  RELATIONSHIPS_HAS_ERRORED,
  RELATIONSHIPS_IS_LOADING,
  RELATIONSHIPS_FETCH_DATA_SUCCESS,
} from '../types/relationships';

import { createAPIRelationshipsURL } from '../helpers/api';


export const setRelationships = (relationships) => {
  return dispatch => {
    dispatch({
      type: SET_RELATIONSHIPS,
      payload: {
        activeRelationships: relationships
      }
    });
  };
};

export const resetRelationships = () => {
  return dispatch => {
    dispatch({
      type: RESET_RELATIONSHIPS,
    });
  };
};

export const getRelationships = (query) => {

  const url = createAPIRelationshipsURL(query.uri);

  return dispatch => {
    dispatch(relationshipsIsLoading(true));
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then((response) => {
        dispatch(relationshipsIsLoading(false));
        return response;
      })
      .then((response) => {
        dispatch(relationshipsFetchDataSuccess({
          activeRelationships: {
            relationships: { ...response },
            title: query.label
          }
        }))
      })
      .catch((error) => dispatch(relationshipsHasErrored(true)))
    }
};

export function relationshipsHasErrored(bool) {
  return {
    type: RELATIONSHIPS_HAS_ERRORED,
    hasErrored: bool
  };
}

export function relationshipsIsLoading(bool) {
  return {
    type: RELATIONSHIPS_IS_LOADING,
    isLoading: bool
  };
}

export function relationshipsFetchDataSuccess(response) {
  return {
    type: RELATIONSHIPS_FETCH_DATA_SUCCESS,
    response,
  };
}
