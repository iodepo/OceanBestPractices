import {
  STATS_HAS_ERRORED,
  STATS_IS_LOADING,
  STATS_FETCH_DATA_SUCCESS
} from '../types/stats';

import { createAPIStatsURL } from '../helpers/api';


// Hit the api for the stats term(s)

export const getStats = () => {

  const url = createAPIStatsURL();

  return dispatch => {
    dispatch(statsIsLoading(true));
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then((response) => {
        dispatch(statsIsLoading(false));
        return response;
      })
      .then((response) => {
        dispatch(statsFetchDataSuccess(response))
      })
      .catch((error) => dispatch(statsHasErrored(true)))
    }
};

export function statsHasErrored(bool) {
  return {
    type: STATS_HAS_ERRORED,
    hasErrored: bool
  };
}

export function statsIsLoading(bool) {
  return {
    type: STATS_IS_LOADING,
    isLoading: bool
  };
}

export function statsFetchDataSuccess(response) {
  return {
    type: STATS_FETCH_DATA_SUCCESS,
    response,
  };
}
