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
      'dc_contributor_author',
      'dc_contributor_corpauthor',
      'dc_contributor_editor',
    ],
    active_search: false,
  },
  {
    title: 'Title',
    id: 'title',
    value: [
      'dc_title',
      'dc_title_alternative',
    ],
    active_search: false,
    autocomplete: true,
  },
  {
    title: 'EOV',
    id: 'eov',
    value: [
      'dc_description_eov',
    ],
    active_search: false,
  },
  {
    title: 'SDG',
    id: 'sdg',
    value: [
      'dc_description_sdg',
    ],
    active_search: false,
  },
  {
    title: 'Document Body',
    id: 'content',
    value: [
      '_bitstreamText',
    ],
    active_search: false,
    autocomplete: true,
  },
  {
    title: 'Journal',
    id: 'journal',
    value: [
      'dc_bibliographicCitation_title',
    ],
    active_search: false,
  },
  {
    title: 'Issuing Agency',
    id: 'publisher',
    value: [
      'dc_publisher',
    ],
    active_search: false,
  },
  {
    title: 'DOI',
    id: 'doi',
    value: [
      'dc_identifier_doi',
    ],
    active_search: false,
  },
  {
    title: 'ECV',
    id: 'ecv',
    value: [
      'dc_description_ecv',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the ECV</b> eg.  Aerosols',
  },
  {
    title: 'EBV',
    id: 'ebv',
    value: [
      'dc_description_ebv',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the EBV</b> eg.  Ecosystem Vertical Profile',
  },
];

export default (state = initialState, action) => {
  const existingState = Array.isArray(initialState) ? initialState : [];

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
