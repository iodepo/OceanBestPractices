import {
  SET_OPTION,
  SET_ACTIVE_OPTIONS
} from '../types/options';

import {
  defaultQuerySize,
  defaultQueryOffset,
 } from '../helpers/api';

import sort_items from '../data/sort-items';

const initialState = [
  {
    title: 'Sort',
    id: 'sort',
    value: sort_items[0].filter,
    items: sort_items,
  },
  {
    title: 'Offset',
    id: 'offset',
    value: defaultQueryOffset,
  },
  {
    title: 'Size',
    id: 'size',
    value: defaultQuerySize,
  },
  {
    title: 'Synonyms',
    id: 'synonyms',
    description: '"anchor ice" has exact synonym "bottom-fast ice"',
    value: false,
    is_advanced_search: true,
  },
  {
    title: 'Refereed',
    id: 'refereed',
    description: 'Limit search to only Refereed documents',
    value: false,
    is_advanced_search: true,
  },
  {
    title: 'Endorsed',
    id: 'endorsed',
    description: 'Limit search to only items that have been Endorsed',
    value: false,
    is_advanced_search: true
  }
];

export default (state = initialState, action) => {

  if ( !Array.isArray(state) ) {
    state = [];
  }

  // Set up a new array with new object instances

  const options = state.map(option => Object.assign({}, option));

  switch ( action.type ) {

    case SET_OPTION:

      return options.map((option) => {

        let updated_option = action.option || {};

        if ( option.id === updated_option.id ) {
          option.value = updated_option.value;
        }

        return option;

      });

    case SET_ACTIVE_OPTIONS:

      const updated_options = action.options.split(',');

      return options.map((option) => {

        if ( updated_options.includes(option.id) ) {
          option.value = true;
        }

        return option;

      });

    default:

      return options;

  }
}
