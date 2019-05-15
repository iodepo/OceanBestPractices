import {
  SET_ACTIVE_FIELDS
} from '../types/fields';

const initialState = [
  {
    title: 'All Fields',
    id: 'all',
    default: true,
    active_search: true,
    autocomplete: true,
  },
  {
    title: 'Author',
    id: 'author',
    value: [
      'author',
      'corp_author',
      'editor',
    ],
    active_search: false,
  },
  {
    title: 'Title',
    id: 'title',
    value: [
      'title',
      'title_alt',
    ],
    active_search: false,
    autocomplete: true,
  },
  {
    title: 'EOV',
    id: 'eov',
    value: [
      'essential_ocean_variables',
    ],
    active_search: false,
  },
  {
    title: 'SDG',
    id: 'sdg',
    value: [
      'sustainable_development_goals',
    ],
    active_search: false,
  },
  {
    title: 'Document Body',
    id: 'content',
    value: [
      'contents',
    ],
    active_search: false,
    autocomplete: true,
  },
  {
    title: 'Journal',
    id: 'journal',
    value: [
      'journal_title',
    ],
    active_search: false,
  },
  {
    title: 'Publisher',
    id: 'publisher',
    value: [
      'publisher',
    ],
    active_search: false,
  },
  {
    title: 'DOI',
    id: 'doi',
    value: [
      'identifier_doi',
    ],
    active_search: false,
  },
];

export default (state = initialState, action) => {

  if ( !Array.isArray(state) ) {
    state = [];
  }

  // Set up a new array with new object instances

  const fields = state.map(field => Object.assign({}, field));

  switch ( action.type ) {

    case SET_ACTIVE_FIELDS:

      return fields.map((field) => {

        field.active_search = false;

        if ( action.field_id && action.field_id === field.id ) {
          field.active_search = true;
        }

        return field;

      });

    default:

      return fields;

  }
}
