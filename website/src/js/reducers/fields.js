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
    help_text: 'Enter any term or phrase and the search will look in ALL metadata fields AND the full text document',
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
    help_text: 'Enter the <b>author name</b>. You can enter just the surname if it is not a common name otherwise eg.  Johannes Karstensen or if you know more than one author  Karstensen Pearlman',
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
    help_text: 'Enter if possible at least the first five words of the <b>title</b> (try all title if you have it)',
  },
  {
    title: 'EOV',
    id: 'eov',
    value: [
      'essential_ocean_variables',
    ],
    active_search: false,
    help_text: 'Search for the <b>full name of the EOV</b> eg. Zooplankton biomass and diversity',
  },
  {
    title: 'SDG',
    id: 'sdg',
    value: [
      'sustainable_development_goals',
    ],
    active_search: false,
    help_text: 'Search for the number of the <b>Sustainable Development Goal</b> eg.  14.1',
  },
  {
    title: 'Document Body',
    id: 'content',
    value: [
      'contents',
    ],
    active_search: false,
    autocomplete: true,
    help_text: 'Enter any term or phrase and the search will look in ONLY the full text of the document',
  },
  {
    title: 'Journal',
    id: 'journal',
    value: [
      'journal_title',
    ],
    active_search: false,
    help_text: 'Search for the full title of the journal or a significant word/s   eg. Methods',
  },
  {
    title: 'Issuing Agency',
    id: 'publisher',
    value: [
      'publisher',
    ],
    active_search: false,
    help_text: 'Enter the full name of the issuing agency/publisher',
  },
  {
    title: 'DOI',
    id: 'doi',
    value: [
      'identifier_doi',
    ],
    active_search: false,
    help_text: 'Enter the  DOI number  eg. 10.2788/4295',
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
