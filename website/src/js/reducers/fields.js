import {
  SET_ACTIVE_FIELDS,
} from '../types/fields';

// TODO: Update help_text fields with language provided by client
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
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
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
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'EOV',
    id: 'eov',
    value: [
      'essential_ocean_variables',
    ],
    active_search: false,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'SDG',
    id: 'sdg',
    value: [
      'sustainable_development_goals',
    ],
    active_search: false,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'Document Body',
    id: 'content',
    value: [
      'contents',
    ],
    active_search: false,
    autocomplete: true,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'Journal',
    id: 'journal',
    value: [
      'journal_title',
    ],
    active_search: false,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'Issuing Agency',
    id: 'publisher',
    value: [
      'publisher',
    ],
    active_search: false,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
  {
    title: 'DOI',
    id: 'doi',
    value: [
      'identifier_doi',
    ],
    active_search: false,
    help_text: '__PUT_TOOLTIP_TEXT_HERE__',
  },
];

export default (state = initialState, action) => {
  if (!Array.isArray(state)) {
    state = [];
  }

  // Set up a new array with new object instances

  const fields = state.map((field) => ({ ...field }));

  switch (action.type) {
    case SET_ACTIVE_FIELDS:

      return fields.map((field) => {
        field.active_search = false;

        if (action.field_id && action.field_id === field.id) {
          field.active_search = true;
        }

        return field;
      });

    default:

      return fields;
  }
};
