import {
  SET_ACTIVE_FIELDS,
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
    title: 'Issuing Agency',
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
  {
    title: 'ECV',
    id: 'ecv',
    value: [
      'essential_climate_variables',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the ECV</b> eg.  Aerosols',
  },
  {
    title: 'EBV',
    id: 'ebv',
    value: [
      'essential_biodiversity_variables',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the EBV</b> eg.  Ecosystem Vertical Profile',
  },
];

export default (state = initialState, action) => {
  let existingState = state;
  if (!Array.isArray(existingState)) {
    existingState = [];
  }

  // Set up a new array with new object instances

  const fields = existingState.map((field) => ({ ...field }));

  switch (action.type) {
    case SET_ACTIVE_FIELDS:

      return fields.map((field) => {
        const returnField = field;

        returnField.active_search = false;

        if (action.field_id && action.field_id === field.id) {
          returnField.active_search = true;
        }

        return returnField;
      });

    default:

      return fields;
  }
};
