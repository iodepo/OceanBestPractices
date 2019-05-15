import {
  SET_OPTION,
  SET_ACTIVE_OPTIONS
} from '../types/options';


export const setOption = (id, value) => {
  return {
    type: SET_OPTION,
    option: {
      id,
      value,
    }
  };
};

export const setActiveOptions = (options) => {
  return {
    type: SET_ACTIVE_OPTIONS,
    options,
  };
};