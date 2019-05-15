import GA from 'react-ga';

import { customDimensionsFromState } from '../helpers/tracker';

export const trackEvent = (settings) => {

  return (dispatch, getState) => {

    const state = getState();
    const custom_dimensions = customDimensionsFromState(state);

    GA.event({
      ...settings,
      ...custom_dimensions,
    });

  };

};
