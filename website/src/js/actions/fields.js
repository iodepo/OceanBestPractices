import {
  SET_ACTIVE_FIELDS
} from '../types/fields';


export const setActiveFields = (field_id) => {
  return {
    type: SET_ACTIVE_FIELDS,
    field_id,
  };
};